// controllers/auth.controller.js
// SIMPLIFIED: Robust login with better error handling

import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import * as tokenService from "../services/token.service.js";
import * as trialService from "../services/trial.service.js";
import * as emailDomainService from "../services/emailDomain.service.js";

export const login = async (req, res) => {
  const { email, password, deviceId } = req.body;

  console.log(`🔐 Login attempt for: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: "MissingFields" });
  }

  try {
    const result = await pool.query(
      `SELECT 
         u.id,
         u.email,
         u.password,
         u.is_admin,
         u.is_super_admin,
         u.is_trial_user,
         u.company_id,
         u.is_active,
         p.full_name, 
         p.department, 
         p.work_hours_start, 
         p.work_hours_end,
         c.name as company_name,
         c.subdomain as company_subdomain,
         c.is_active as company_active,
         c.email_domain as company_email_domain
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Login failed: User not found - ${email}`);
      return res.status(401).json({ error: "InvalidCredentials" });
    }

    const user = result.rows[0];
    console.log(`👤 User found: ${user.email}, isAdmin: ${user.is_admin}, isSuperAdmin: ${user.is_super_admin}`);

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log(`❌ Login failed: Invalid password - ${email}`);
      return res.status(401).json({ error: "InvalidCredentials" });
    }

    console.log(`✅ Login SUCCESS: ${user.email} | Admin: ${user.is_admin} | Company: ${user.company_name || 'Super Admin'}`);

    // Clean up old sessions
    await pool.query(
      "DELETE FROM user_sessions WHERE user_id = $1",
      [user.id]
    );

    // Generate token
    const token = tokenService.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: user.is_admin || false,
      isSuperAdmin: user.is_super_admin || false,
      isTrialUser: user.is_trial_user || false,
      companyId: user.company_id
    }, '7d');

    // Create session
    await tokenService.createSession(user.id, token, 7, user.company_id);

    res.json({
      message: "LoginSuccess",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        department: user.department,
        workHoursStart: user.work_hours_start,
        workHoursEnd: user.work_hours_end,
        isAdmin: user.is_admin || false,
        isSuperAdmin: user.is_super_admin || false,
        isTrialUser: user.is_trial_user || false,
        companyId: user.company_id,
        companyName: user.company_name,
        companySubdomain: user.company_subdomain,
        companyEmailDomain: user.company_email_domain
      },
    });
  } catch (error) {
    console.error(`❌ Login ERROR for ${email}:`, error);
    return res.status(500).json({ 
      error: "LoginFailed",
      message: "An error occurred during login. Please try again."
    });
  }
};

export const logout = async (req, res) => {
  const token = tokenService.extractTokenFromHeader(req.headers["authorization"]);
  if (token) {
    await tokenService.deleteSession(token);
  }
  res.json({ message: "LogoutSuccess" });
};

export const signup = async (req, res) => {
  const { email, password, deviceId, fullName } = req.body;

  console.log(`📝 Signup attempt for: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ error: "MissingFields" });
  }

  try {
    // Check if email already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`❌ Signup failed: Email already exists - ${email}`);
      return res.status(409).json({ error: "EmailAlreadyExists" });
    }

    // Extract domain and check if it's generic
    const isGenericEmail = emailDomainService.isGenericEmailDomain(email);
    const isTrialUser = isGenericEmail;
    
    let company = null;

    if (!isGenericEmail) {
      company = await emailDomainService.findCompanyByEmailDomain(email);
      if (company) {
        console.log(`📧 Email domain matched: ${email} → ${company.name}`);
      }
    }

    // Check trial status for generic emails
    if (isTrialUser && deviceId) {
      const trialStatus = await trialService.checkTrialStatus(deviceId);
      if (!trialStatus.isValid) {
        return res.status(403).json({
          error: "TRIAL_EXPIRED",
          message: trialStatus.message || "Trial period has ended",
          daysRemaining: trialStatus.daysRemaining
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password, is_admin, is_trial_user, company_id, is_active)
       VALUES ($1, $2, false, $3, $4, true)
       RETURNING id, email, is_trial_user, company_id`,
      [
        email, 
        hashedPassword, 
        isTrialUser,
        company?.id || null
      ]
    );

    const user = userResult.rows[0];

    // Create profile
    await pool.query(
      `INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)`,
      [user.id, fullName || null]
    );

    // Register device in trial system if trial user
    if (isTrialUser && deviceId) {
      await trialService.registerDevice(deviceId, user.id);
    }

    // Generate token
    const token = tokenService.generateToken({
      id: user.id,
      email: user.email,
      isAdmin: false,
      isSuperAdmin: false,
      isTrialUser: user.is_trial_user,
      companyId: user.company_id
    }, '7d');

    await tokenService.createSession(user.id, token, 7, user.company_id);

    console.log(`✅ Signup SUCCESS: ${email} | Trial: ${isTrialUser} | Company: ${company?.name || 'None'}`);

    res.status(201).json({
      message: "SignupSuccess",
      token,
      signupType: isTrialUser ? 'trial' : 'company',
      user: {
        id: user.id,
        email: user.email,
        fullName: fullName || null,
        isTrialUser: user.is_trial_user,
        companyId: user.company_id,
        companyName: company?.name || null,
        companySubdomain: company?.subdomain || null
      },
      ...(isTrialUser && {
        restrictions: emailDomainService.getTrialUserRestrictions(),
        message: 'Trial users have read-only access. Contact your company admin to get added.'
      })
    });
  } catch (error) {
    console.error(`❌ Signup ERROR for ${email}:`, error);
    res.status(500).json({ 
      error: "SignupFailed",
      message: "An error occurred during signup. Please try again."
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "EmailRequired" });
  }

  const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

  // Always return success to prevent email enumeration
  if (result.rows.length === 0) {
    console.log(`📧 Password reset requested for non-existent email: ${email}`);
    return res.json({ message: "PasswordResetEmailSent" });
  }

  const resetToken = tokenService.generateResetToken();
  await tokenService.saveResetToken(email, resetToken);

  console.log(`🔑 Password Reset Token for ${email}:`, resetToken);

  res.json({
    message: "PasswordResetEmailSent",
    resetToken: resetToken,
  });
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "MissingFields" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "PasswordTooShort" });
  }

  try {
    const userId = await tokenService.validateResetToken(token);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    await tokenService.clearResetToken(userId);

    console.log(`🔑 Password reset SUCCESS for user: ${userId}`);
    res.json({ message: "PasswordResetSuccess" });
  } catch (error) {
    console.error(`❌ Password reset ERROR:`, error);
    res.status(400).json({ error: "InvalidOrExpiredToken" });
  }
};

export const getProfile = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       u.id, 
       u.email, 
       u.is_admin,
       u.is_super_admin,
       u.is_trial_user,
       u.company_id,
       p.full_name, 
       p.department, 
       p.work_hours_start, 
       p.work_hours_end, 
       p.created_at,
       c.name as company_name,
       c.subdomain as company_subdomain,
       c.email_domain as company_email_domain
     FROM users u
     LEFT JOIN profiles p ON u.id = p.user_id
     LEFT JOIN companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "UserNotFound" });
  }

  const user = result.rows[0];

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      department: user.department,
      workHoursStart: user.work_hours_start,
      workHoursEnd: user.work_hours_end,
      createdAt: user.created_at,
      isAdmin: user.is_admin || false,
      isSuperAdmin: user.is_super_admin || false,
      isTrialUser: user.is_trial_user || false,
      companyId: user.company_id,
      companyName: user.company_name,
      companySubdomain: user.company_subdomain,
      companyEmailDomain: user.company_email_domain
    }
  });
};

export const updateProfile = async (req, res) => {
  const { fullName, department, workHoursStart, workHoursEnd } = req.body;

  if (fullName !== undefined && fullName !== null) {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: "InvalidName", message: "Name must be at least 2 characters" });
    }
    if (trimmedName.length > 50) {
      return res.status(400).json({ error: "InvalidName", message: "Name must be less than 50 characters" });
    }
  }

  const result = await pool.query(
    `UPDATE profiles 
     SET full_name = $1, department = $2, work_hours_start = $3, work_hours_end = $4
     WHERE user_id = $5
     RETURNING *`,
    [fullName, department, workHoursStart, workHoursEnd, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "ProfileNotFound" });
  }

  res.json({
    message: "ProfileUpdated",
    profile: result.rows[0]
  });
};

export const convertTrialUser = async (req, res) => {
  const { newEmail, password } = req.body;

  if (!newEmail) {
    return res.status(400).json({ error: "NewEmailRequired" });
  }

  try {
    const userCheck = await pool.query(
      'SELECT is_trial_user, company_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "UserNotFound" });
    }

    if (!userCheck.rows[0].is_trial_user) {
      return res.status(400).json({ error: "NotTrialUser", message: "You are already a full user" });
    }

    const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "InvalidPassword" });
    }

    const isGeneric = emailDomainService.isGenericEmailDomain(newEmail);
    if (isGeneric) {
      return res.status(400).json({ error: "GenericEmailNotAllowed", message: "Please use your company email address" });
    }

    const company = await emailDomainService.findCompanyByEmailDomain(newEmail);
    if (!company) {
      return res.status(404).json({ error: "CompanyNotFound", message: "No company registered with this email domain" });
    }

    await emailDomainService.convertTrialUserToFullUser(req.user.id, newEmail, company.id);
    await pool.query('UPDATE users SET company_id = $1, is_trial_user = false WHERE id = $2', [company.id, req.user.id]);

    console.log(`✅ Trial user ${req.user.id} converted to full user: ${newEmail}`);
    res.json({ message: "ConversionSuccess", newEmail, companyName: company.name, companySubdomain: company.subdomain });
  } catch (error) {
    res.status(400).json({ error: "ConversionFailed", message: error.message });
  }
};

export const clearPincode = async (req, res) => {
  await pool.query(`UPDATE users SET pincode = NULL WHERE id = $1`, [req.user.id]);
  res.json({ message: "PincodeCleared" });
};

export const verifyToken = (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      isAdmin: req.user.isAdmin || false,
      isSuperAdmin: req.user.isSuperAdmin || false,
      isTrialUser: req.user.isTrialUser || false,
      companyId: req.user.companyId
    }
  });
};

export const getTrialStatus = async (req, res) => {
  const { deviceId } = req.query;

  if (!deviceId) {
    return res.status(400).json({ error: "DeviceIdRequired" });
  }

  const status = await trialService.checkTrialStatus(deviceId);
  res.json(status);
};

export const getTrialStats = async (req, res) => {
  const stats = await trialService.getTrialStats();
  res.json(stats);
};

export const blockDevice = async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "DeviceIdRequired" });
  }
  await trialService.blockDevice(deviceId);
  res.json({ message: "DeviceBlocked" });
};

export const unblockDevice = async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "DeviceIdRequired" });
  }
  await trialService.unblockDevice(deviceId);
  res.json({ message: "DeviceUnblocked" });
};
