// controllers/meetings.controller.js
// UPDATED: All queries now filter by company_id
// UPDATED v2: PostGIS 50m proximity verification added

import { pool } from "../db.js";
import { verifyMeetingProximity, saveClientLocationToCache } from "../services/geocoding.service.js";

export const startMeeting = async (req, res) => {
  const { clientId, latitude, longitude, accuracy } = req.body;

  try {
    console.log(`🚀 [startMeeting] userId: ${req.user?.id}, companyId: ${req.companyId}, clientId: ${clientId}`);

    if (!clientId) {
      return res.status(400).json({ 
        error: "ClientIdRequired",
        message: "A valid client ID is required to start a meeting."
      });
    }

    // ─────────────────────────────────────────────────────────
    // 50m PROXIMITY VERIFICATION (PostGIS earth_distance math)
    // ─────────────────────────────────────────────────────────
    let proximityResult = { verified: false, distanceMetres: null, reason: "NotChecked" };

    if (latitude && longitude) {
      const params = [clientId];
      let query = `SELECT latitude, longitude, name FROM clients WHERE id = $1`;
      
      if (!req.isSuperAdmin) {
        query += ` AND company_id = $2`;
        params.push(req.companyId);
      }
      
      const clientData = await pool.query(query, params);
      const client = clientData.rows[0];

      if (!client) {
        return res.status(404).json({
          error: "ClientNotFound",
          message: "The requested client does not exist or you do not have permission to access it."
        });
      }

      if (client.latitude != null && client.longitude != null) {
        const cLat = parseFloat(client.latitude);
        const cLng = parseFloat(client.longitude);

        proximityResult = await verifyMeetingProximity(latitude, longitude, cLat, cLng);

        if (proximityResult.verified) {
          const { getPincodeFromLocalDB } = await import("../services/geocoding.service.js");
          const pincode = await getPincodeFromLocalDB(latitude, longitude);
          await saveClientLocationToCache(clientId, latitude, longitude, pincode, req.user.id);
          console.log(`📍 Agent verified at ${proximityResult.distanceMetres}m from ${client.name} — location cached.`);
        } else {
          console.log(`❌ BLOCK: Agent is ${proximityResult.distanceMetres}m from ${client.name} (threshold: 50m).`);
          return res.status(403).json({
            error: "TooFarFromClient",
            message: `You are too far from ${client.name}. Current distance: ${proximityResult.distanceMetres}m. Please move within 50m.`,
            distanceMetres: proximityResult.distanceMetres
          });
        }
      } else {
        proximityResult.reason = "ClientLocationUnknown";
        proximityResult.verified = true; 
        const { getPincodeFromLocalDB } = await import("../services/geocoding.service.js");
        const pincode = await getPincodeFromLocalDB(latitude, longitude);
        await saveClientLocationToCache(clientId, latitude, longitude, pincode, req.user.id);
      }
    } else {
      return res.status(400).json({
        error: "GpsCoordinatesRequired",
        message: "GPS coordinates are mandatory to start a meeting. Please ensure location is enabled."
      });
    }

    // ✅ Check for active meeting
    const existingMeeting = await pool.query(
      `SELECT id FROM meetings 
       WHERE client_id = $1 AND user_id = $2 AND status = 'IN_PROGRESS' 
       ${!req.isSuperAdmin ? 'AND company_id = $3' : ''} LIMIT 1`,
      !req.isSuperAdmin ? [clientId, req.user.id, req.companyId] : [clientId, req.user.id]
    );

    if (existingMeeting.rows.length > 0) {
      return res.status(400).json({
        error: "ActiveMeetingExists",
        message: "You already have an active meeting with this client."
      });
    }

    const result = await pool.query(
      `INSERT INTO meetings 
       (user_id, client_id, start_time, start_latitude, start_longitude, start_accuracy, status, company_id, proximity_verified, proximity_distance, proximity_reason)
       VALUES ($1, $2, NOW(), $3, $4, $5, 'IN_PROGRESS', $6, $7, $8, $9)
       RETURNING 
         id,
         user_id as "userId",
         client_id as "clientId",
         start_time as "startTime",
         end_time as "endTime",
         start_latitude as "startLatitude",
         start_longitude as "startLongitude",
         start_accuracy as "startAccuracy",
         end_latitude as "endLatitude",
         end_longitude as "endLongitude",
         end_accuracy as "endAccuracy",
         status,
         comments,
         attachments,
         proximity_verified,
         proximity_distance,
         proximity_reason,
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        req.user.id,
        clientId,
        latitude || null,
        longitude || null,
        accuracy || null,
        req.companyId,
        proximityResult.verified,
        proximityResult.distanceMetres,
        proximityResult.reason
      ]
    );

    const meetingRow = result.rows[0];
    const { proximity_verified, proximity_distance, proximity_reason, ...restMeeting } = meetingRow;

    console.log(`✅ Meeting started: ${restMeeting.id}`);

    res.status(201).json({
      message: "MeetingStarted",
      meeting: restMeeting,
      proximity: proximityResult
    });

  } catch (error) {
    console.error("❌ CRITICAL ERROR [startMeeting]:", error);
    res.status(500).json({
      error: "StartMeetingFailed",
      message: "An unexpected error occurred while starting the meeting: " + error.message
    });
  }
};

export const updateMeeting = async (req, res) => {
  const { id } = req.params;
  const {
    endTime,
    status,
    comments,
    attachments,
    latitude,
    longitude,
    accuracy,
    clientStatus
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ✅ UPDATED: Verify meeting belongs to user AND company
    const checkResult = await client.query(
      `SELECT client_id FROM meetings WHERE id = $1 AND user_id = $2 AND company_id = $3`,
      [id, req.user.id, req.companyId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "MeetingNotFound" });
    }

    const clientId = checkResult.rows[0].client_id;

    // Update meeting
    const meetingResult = await client.query(
      `UPDATE meetings
       SET end_time = COALESCE($1, end_time, NOW()),
           end_latitude = COALESCE($2, end_latitude),
           end_longitude = COALESCE($3, end_longitude),
           end_accuracy = COALESCE($4, end_accuracy),
           status = COALESCE($5, status),
           comments = COALESCE($6, comments),
           attachments = COALESCE($7, attachments),
           updated_at = NOW()
       WHERE id = $8
       RETURNING 
         id,
         user_id as "userId",
         client_id as "clientId",
         start_time as "startTime",
         end_time as "endTime",
         start_latitude as "startLatitude",
         start_longitude as "startLongitude",
         start_accuracy as "startAccuracy",
         end_latitude as "endLatitude",
         end_longitude as "endLongitude",
         end_accuracy as "endAccuracy",
         status,
         comments,
         attachments,
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        endTime || null,
        latitude || null,
        longitude || null,
        accuracy || null,
        status || 'COMPLETED',
        comments || null,
        attachments ? JSON.stringify(attachments) : null,
        id
      ]
    );

    // Update client status if provided
    if (clientStatus && ['active', 'inactive', 'completed'].includes(clientStatus.toLowerCase())) {
      // ✅ UPDATED: Verify client belongs to same company before updating
      await client.query(
        `UPDATE clients 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2 AND company_id = $3`,
        [clientStatus.toLowerCase(), clientId, req.companyId]
      );

      console.log(`✅ Client ${clientId} status updated to: ${clientStatus}`);
    }

    await client.query('COMMIT');

    console.log(`✅ Meeting ended: ${id} | Client status: ${clientStatus || 'unchanged'}`);

    res.json({
      message: "MeetingUpdated",
      meeting: meetingResult.rows[0],
      clientStatusUpdated: !!clientStatus
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating meeting:", error);
    res.status(500).json({
      error: "UpdateFailed",
      message: error.message
    });
  } finally {
    client.release();
  }
};

export const getActiveMeeting = async (req, res) => {
  const { clientId } = req.params;

  // ✅ UPDATED: Add company_id filter
  const result = await pool.query(
    `SELECT 
       id,
       user_id as "userId",
       client_id as "clientId",
       start_time as "startTime",
       end_time as "endTime",
       start_latitude as "startLatitude",
       start_longitude as "startLongitude",
       start_accuracy as "startAccuracy",
       end_latitude as "endLatitude",
       end_longitude as "endLongitude",
       end_accuracy as "endAccuracy",
       status,
       comments,
       attachments,
       proximity_verified,
       proximity_distance,
       proximity_reason,
       created_at as "createdAt",
       updated_at as "updatedAt"
     FROM meetings
     WHERE client_id = $1 
     AND user_id = $2
     AND company_id = $3
     AND status = 'IN_PROGRESS'
     ORDER BY start_time DESC
     LIMIT 1`,
    [clientId, req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.json({ meeting: null });
  }

  const row = result.rows[0];
  const { proximity_verified, proximity_distance, proximity_reason, ...rest } = row;

  res.json({
    meeting: {
      ...rest,
      proximity: proximity_verified !== null ? {
        verified: proximity_verified,
        distanceMetres: proximity_distance,
        reason: proximity_reason
      } : null
    }
  });
};

export const uploadAttachment = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "NoFileUploaded" });
  }

  // ✅ UPDATED: Add company_id filter
  const checkResult = await pool.query(
    `SELECT id FROM meetings WHERE id = $1 AND user_id = $2 AND company_id = $3`,
    [id, req.user.id, req.companyId]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: "MeetingNotFound" });
  }

  const fileName = `${Date.now()}-${req.file.originalname}`;
  const fileUrl = `https://storage.yourdomain.com/meetings/${fileName}`;

  console.log(`📎 Meeting attachment uploaded: ${fileName} (${req.file.size} bytes)`);

  const currentResult = await pool.query(
    `SELECT attachments FROM meetings WHERE id = $1`,
    [id]
  );

  const currentAttachments = currentResult.rows[0]?.attachments || [];
  const updatedAttachments = [...currentAttachments, fileUrl];

  await pool.query(
    `UPDATE meetings 
     SET attachments = $1, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(updatedAttachments), id]
  );

  res.json({
    message: "AttachmentUploaded",
    url: fileUrl,
    fileName: fileName
  });
};

export const getMeetings = async (req, res) => {
  const { clientId, status, startDate, endDate, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  // ✅ UPDATED: Add company_id filter
  let query = `
    SELECT 
      m.id,
      m.user_id as "userId",
      m.client_id as "clientId",
      m.start_time as "startTime",
      m.end_time as "endTime",
      m.start_latitude as "startLatitude",
      m.start_longitude as "startLongitude",
      m.start_accuracy as "startAccuracy",
      m.end_latitude as "endLatitude",
      m.end_longitude as "endLongitude",
      m.end_accuracy as "endAccuracy",
      m.status,
      m.comments,
      m.attachments,
      m.proximity_verified,
      m.proximity_distance,
      m.proximity_reason,
      m.created_at as "createdAt",
      m.updated_at as "updatedAt",
      c.name as "clientName",
      c.address as "clientAddress"
    FROM meetings m
    LEFT JOIN clients c ON m.client_id = c.id
    WHERE m.user_id = $1
  `;
  const params = [req.user.id];
  
  if (!req.isSuperAdmin) {
    query += ` AND m.company_id = $2`;
    params.push(req.companyId);
  }
  let paramCount = params.length;

  if (clientId) {
    paramCount++;
    query += ` AND m.client_id = $${paramCount}`;
    params.push(clientId);
  }

  if (status) {
    paramCount++;
    query += ` AND m.status = $${paramCount}`;
    params.push(status);
  }

  if (startDate) {
    paramCount++;
    query += ` AND m.start_time >= $${paramCount}`;
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND m.start_time <= $${paramCount}`;
    params.push(endDate);
  }

  query += ` ORDER BY m.start_time DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // ✅ UPDATED: Add company_id filter to count query
  let countQuery = "SELECT COUNT(*) FROM meetings WHERE user_id = $1 AND company_id = $2";
  const countParams = [req.user.id, req.companyId];
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  const mappedMeetings = result.rows.map(row => {
    const { proximity_verified, proximity_distance, proximity_reason, ...rest } = row;
    return {
      ...rest,
      proximity: proximity_verified !== null ? {
        verified: proximity_verified,
        distanceMetres: proximity_distance,
        reason: proximity_reason
      } : null
    };
  });

  res.json({
    meetings: mappedMeetings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

export const getMeetingById = async (req, res) => {
  const { id } = req.params;

  // ✅ UPDATED: Add company_id filter
  const result = await pool.query(
    `SELECT 
       m.id,
       m.user_id as "userId",
       m.client_id as "clientId",
       m.start_time as "startTime",
       m.end_time as "endTime",
       m.start_latitude as "startLatitude",
       m.start_longitude as "startLongitude",
       m.start_accuracy as "startAccuracy",
       m.end_latitude as "endLatitude",
       m.end_longitude as "endLongitude",
       m.end_accuracy as "endAccuracy",
       m.status,
       m.comments,
       m.attachments,
       m.proximity_verified,
       m.proximity_distance,
       m.proximity_reason,
       m.created_at as "createdAt",
       m.updated_at as "updatedAt",
       c.name as "clientName",
       c.email as "clientEmail",
       c.phone as "clientPhone",
       c.address as "clientAddress"
     FROM meetings m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.id = $1 AND m.user_id = $2 AND m.company_id = $3`,
    [id, req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "MeetingNotFound" });
  }

  const row = result.rows[0];
  const { proximity_verified, proximity_distance, proximity_reason, ...rest } = row;

  res.json({
    meeting: {
      ...rest,
      proximity: proximity_verified !== null ? {
        verified: proximity_verified,
        distanceMetres: proximity_distance,
        reason: proximity_reason
      } : null
    }
  });
};

export const deleteMeeting = async (req, res) => {
  const { id } = req.params;

  // ✅ UPDATED: Add company_id filter
  const result = await pool.query(
    `DELETE FROM meetings 
     WHERE id = $1 AND user_id = $2 AND company_id = $3
     RETURNING id`,
    [id, req.user.id, req.companyId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "MeetingNotFound" });
  }

  console.log(`🗑️ Meeting deleted: ${id}`);

  res.json({ message: "MeetingDeleted" });
};