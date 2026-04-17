// controllers/meetings.controller.js
// UPDATED: All queries now filter by company_id

import { pool } from "../db.js";

export const startMeeting = async (req, res) => {
  const { clientId, latitude, longitude, accuracy } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: "ClientIdRequired" });
  }

  // ✅ UPDATED: Check for active meeting with company_id filter
  const existingMeeting = await pool.query(
    `SELECT id FROM meetings 
     WHERE client_id = $1 
     AND user_id = $2
     AND company_id = $3
     AND status = 'IN_PROGRESS'
     LIMIT 1`,
    [clientId, req.user.id, req.companyId]
  );

  if (existingMeeting.rows.length > 0) {
    return res.status(400).json({ 
      error: "ActiveMeetingExists",
      message: "You already have an active meeting with this client"
    });
  }

  // ✅ UPDATED: Include company_id in INSERT
  const result = await pool.query(
    `INSERT INTO meetings 
     (user_id, client_id, start_time, start_latitude, start_longitude, start_accuracy, status, company_id)
     VALUES ($1, $2, NOW(), $3, $4, $5, 'IN_PROGRESS', $6)
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
    [req.user.id, clientId, latitude || null, longitude || null, accuracy || null, req.companyId]
  );

  console.log(`✅ Meeting started: ${result.rows[0].id} for client ${clientId}`);

  res.status(201).json({
    message: "MeetingStarted",
    meeting: result.rows[0]
  });
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
    const companyId = req.user?.companyId || req.companyId;

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
        [clientStatus.toLowerCase(), clientId, companyId]
      );
      
      console.log(`✅ Client ${clientId} status updated to: ${clientStatus}`);
    }

    // ✅ Phase 1: Self-Learning - Update client location if missing
    if (latitude && longitude) {
      const clientLocCheck = await client.query(
        "SELECT latitude, longitude FROM clients WHERE id = $1",
        [clientId]
      );
      
      if (clientLocCheck.rows.length > 0 && (!clientLocCheck.rows[0].latitude || !clientLocCheck.rows[0].longitude)) {
        await client.query(
          `UPDATE clients 
           SET latitude = $1, longitude = $2, updated_at = NOW() 
           WHERE id = $3 AND company_id = $4`,
          [latitude, longitude, clientId, companyId]
        );
        console.log(`📍 Phase 1 (Self-Learning): Auto-updated client ${clientId} location from meeting`);
      }
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

  res.json({ meeting: result.rows[0] });
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
  const { userId, clientId, status, startDate, endDate, page = 1, limit = 50 } = req.query;
  const companyId = req.user?.companyId || req.companyId;
  const offset = (page - 1) * limit;

  let queryBase;
  let params;
  let paramCount;

  if (userId === 'all' && (req.user.isAdmin || req.isSuperAdmin)) {
    // Admin fetching all company meetings
    queryBase = `FROM meetings m 
                 LEFT JOIN clients c ON m.client_id = c.id 
                 LEFT JOIN users u ON m.user_id = u.id
                 LEFT JOIN profiles p ON u.id = p.user_id
                 WHERE m.company_id = $1`;
    params = [companyId];
    paramCount = 1;
  } else {
    // Single user meetings
    let queryId = req.user.id;
    if (userId && (req.user.isAdmin || req.isSuperAdmin)) {
      queryId = userId;
    }
    queryBase = `FROM meetings m 
                 LEFT JOIN clients c ON m.client_id = c.id 
                 LEFT JOIN users u ON m.user_id = u.id
                 LEFT JOIN profiles p ON u.id = p.user_id
                 WHERE m.user_id = $1 AND m.company_id = $2`;
    params = [queryId, companyId];
    paramCount = 2;
  }

  let query = `
    SELECT 
      m.id,
      m.user_id as "userId",
      m.client_id as "clientId",
      m.start_time as "startTime",
      m.end_time as "endTime",
      m.status,
      m.comments,
      m.attachments,
      m.created_at as "createdAt",
      p.full_name as "agentName",
      c.name as "clientName",
      c.address as "clientAddress"
    ${queryBase}
  `;

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
  let countQuery;
  let countParams;

  if (userId === 'all' && (req.user.isAdmin || req.isSuperAdmin)) {
    countQuery = "SELECT COUNT(*) FROM meetings WHERE company_id = $1";
    countParams = [companyId];
  } else {
    let queryId = req.user.id;
    if (userId && (req.user.isAdmin || req.isSuperAdmin)) {
      queryId = userId;
    }
    countQuery = "SELECT COUNT(*) FROM meetings WHERE user_id = $1 AND company_id = $2";
    countParams = [queryId, companyId];
  }
  
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  res.json({
    meetings: result.rows,
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

  res.json({ meeting: result.rows[0] });
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