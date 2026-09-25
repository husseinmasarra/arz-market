const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  const { username, password, full_name, phone, email } = req.body;

  if (!username || !password || !full_name || !phone || !email) {
    return res.status(400).json({ 
      error_ar: 'الرجاء ملء جميع الحقول المطلوبة لإنشاء الحساب بأمان', 
      error_en: 'Please fill out all required fields for secure account registration' 
    });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password;
  const cleanFullName = full_name.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim();

  if (cleanUsername.length < 3) {
    return res.status(400).json({
      error_ar: 'اسم المستخدم يجب أن يكون من ٣ حروف على الأقل',
      error_en: 'Username must be at least 3 characters'
    });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({
      error_ar: 'كلمة المرور يجب أن تكون من ٦ خانات على الأقل لضمان الأمان',
      error_en: 'Password must be at least 6 characters for security'
    });
  }

  if (cleanPhone.length < 7) {
    return res.status(400).json({
      error_ar: 'الرجاء إدخال رقم هاتف صحيح (٧ أرقام على الأقل)',
      error_en: 'Please enter a valid phone number (at least 7 digits)'
    });
  }

  if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
    return res.status(400).json({
      error_ar: 'الرجاء إدخال بريد إلكتروني صحيح',
      error_en: 'Please enter a valid email address'
    });
  }

  try {
    const existingUser = await db.getAsync('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (existingUser) {
      return res.status(400).json({ error_ar: 'اسم المستخدم مسجل مسبقاً', error_en: 'Username is already taken' });
    }

    const hashedPassword = bcrypt.hashSync(cleanPassword, 10);
    const result = await db.runAsync(
      "INSERT INTO users (username, password, role, permissions, phone, email, full_name) VALUES (?, ?, 'user', '[]', ?, ?, ?)",
      [cleanUsername, hashedPassword, cleanPhone, cleanEmail, cleanFullName]
    );

    // Return success
    res.status(201).json({
      message_ar: 'تم إنشاء الحساب بنجاح!',
      message_en: 'Account created successfully!',
      user: {
        id: result.lastID,
        username: cleanUsername,
        role: 'user',
        phone: cleanPhone,
        email: cleanEmail,
        full_name: cleanFullName
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error_ar: 'خطأ في الخادم أثناء التسجيل', error_en: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      error_ar: 'الرجاء إدخال الاسم الكامل أو رقم الهاتف أو البريد وكلمة المرور', 
      error_en: 'Please enter your full name, phone or email and password' 
    });
  }

  const identifier = username.trim();
  const cleanDigits = identifier.replace(/[^0-9]/g, '');

  try {
    let users = await db.allAsync(`
      SELECT * FROM users 
      WHERE LOWER(username) = LOWER(?) 
         OR LOWER(full_name) = LOWER(?)
         OR LOWER(email) = LOWER(?) 
         OR phone = ?
    `, [identifier, identifier, identifier, identifier]);

    if ((!users || users.length === 0) && cleanDigits.length >= 7) {
      users = await db.allAsync('SELECT * FROM users WHERE phone LIKE ?', [`%${cleanDigits.slice(-7)}`]);
    }

    if (!users || users.length === 0) {
      return res.status(400).json({ 
        error_ar: 'الاسم الكامل أو رقم الهاتف/البريد أو كلمة المرور غير صحيحة', 
        error_en: 'Invalid credentials or password' 
      });
    }

    const matchedUser = users.find(u => bcrypt.compareSync(password, u.password));
    if (!matchedUser) {
      return res.status(400).json({ 
        error_ar: 'الاسم الكامل أو رقم الهاتف/البريد أو كلمة المرور غير صحيحة', 
        error_en: 'Invalid credentials or password' 
      });
    }

    const user = matchedUser;

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message_ar: `مرحباً بك مجدداً، ${user.full_name || user.username}!`,
      message_en: `Welcome back, ${user.full_name || user.username}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: JSON.parse(user.permissions || '[]')
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error_ar: 'خطأ في الخادم أثناء تسجيل الدخول', error_en: 'Server error during login' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await db.getAsync('SELECT id, username, full_name, phone, email, role, permissions, discount_used, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error_ar: 'المستخدم غير موجود', error_en: 'User not found' });
    }
    res.json({
      user: {
        ...user,
        permissions: JSON.parse(user.permissions || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error_ar: 'خطأ في الخادم', error_en: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, current_password, new_password } = req.body;
    const userId = req.user.id;

    const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error_ar: 'المستخدم غير موجود', error_en: 'User not found' });
    }

    const cleanFullName = full_name !== undefined ? full_name.trim() : user.full_name;
    const cleanPhone = phone !== undefined ? phone.trim() : user.phone;

    let hashedPassword = user.password;
    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({ 
          error_ar: 'كلمة المرور الجديدة يجب أن تكون من ٦ خانات على الأقل', 
          error_en: 'New password must be at least 6 characters' 
        });
      }
      if (user.password && current_password) {
        const isMatch = bcrypt.compareSync(current_password, user.password);
        if (!isMatch) {
          return res.status(400).json({ 
            error_ar: 'كلمة المرور الحالية غير صحيحة', 
            error_en: 'Current password is incorrect' 
          });
        }
      }
      hashedPassword = bcrypt.hashSync(new_password, 10);
    }

    await db.runAsync(
      'UPDATE users SET full_name = ?, phone = ?, password = ? WHERE id = ?',
      [cleanFullName, cleanPhone, hashedPassword, userId]
    );

    const updated = await db.getAsync('SELECT id, username, full_name, phone, email, role, permissions, discount_used, created_at FROM users WHERE id = ?', [userId]);

    res.json({
      message_ar: 'تم تحديث بياناتك بنجاح',
      message_en: 'Profile updated successfully',
      user: {
        ...updated,
        permissions: JSON.parse(updated.permissions || '[]')
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تحديث البيانات', error_en: 'Error updating profile' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, username, role, permissions, discount_used, created_at FROM users ORDER BY id DESC');
    const formattedUsers = users.map(u => ({
      ...u,
      permissions: JSON.parse(u.permissions || '[]')
    }));
    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error_ar: 'خطأ في تحميل قائمة المستخدمين', error_en: 'Error fetching users' });
  }
};

exports.updateUserRoleAndPermissions = async (req, res) => {
  const { id } = req.params;
  const { role, permissions } = req.body; // role: 'admin', 'employee', or 'user'

  if (!role || !permissions) {
    return res.status(400).json({ error_ar: 'المعطيات غير كاملة', error_en: 'Role and permissions are required' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error_ar: 'المستخدم غير موجود', error_en: 'User not found' });
    }

    if (user.role === 'admin' && req.user.username !== 'husseinmassara' && req.user.username !== 'city-hunter') {
      return res.status(403).json({ error_ar: 'لا يمكن تعديل صلاحيات المدير العام إلا من قبله', error_en: 'Only the super admin can modify admin permissions' });
    }

    const effectivePermissions = role === 'admin'
      ? ['products', 'categories', 'orders', 'users', 'settings', 'employees', 'reports', 'inventory', 'coupons', 'chat', 'merchants']
      : permissions;

    await db.runAsync(
      'UPDATE users SET role = ?, permissions = ? WHERE id = ?',
      [role, JSON.stringify(effectivePermissions), id]
    );

    res.json({ message_ar: 'تم تحديث صلاحيات المستخدم بنجاح', message_en: 'User permissions updated successfully' });
  } catch (err) {
    console.error('Update user permissions error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تحديث الصلاحيات', error_en: 'Error updating user permissions' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential, email: directEmail, name: directName, google_id: directGoogleId } = req.body;
    let email = directEmail;
    let full_name = directName;
    let google_id = directGoogleId;

    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) email = payload.email;
          if (payload.name) full_name = payload.name;
          if (payload.sub) google_id = payload.sub;
        }
      } catch (e) {
        console.warn('Error parsing Google JWT credential:', e.message);
      }
    }

    if (!email) {
      return res.status(400).json({
        error_ar: 'تعذر الحصول على البريد الإلكتروني من حساب Google',
        error_en: 'Could not retrieve email from Google account'
      });
    }

    email = email.trim().toLowerCase();
    full_name = (full_name || email.split('@')[0]).trim();

    // Check if user exists by email
    let user = await db.getAsync('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user) {
      const usernamePrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      let baseUsername = usernamePrefix || `google_user_${Date.now()}`;
      let usernameCandidate = baseUsername;
      
      const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [usernameCandidate]);
      if (existingUser) {
        usernameCandidate = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const randomPassword = bcrypt.hashSync(Math.random().toString(36) + Date.now().toString(), 10);
      const insertResult = await db.runAsync(
        "INSERT INTO users (username, password, role, permissions, phone, email, full_name) VALUES (?, ?, 'user', '[]', '', ?, ?)",
        [usernameCandidate, randomPassword, email, full_name]
      );

      user = {
        id: insertResult.lastID,
        username: usernameCandidate,
        role: 'user',
        permissions: '[]',
        phone: '',
        email,
        full_name
      };
    }

    // Sign Arz-Mart JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message_ar: `مرحباً بك، ${user.full_name || user.username}!`,
      message_en: `Welcome, ${user.full_name || user.username}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : (user.permissions || [])
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تسجيل الدخول عبر Google', error_en: 'Server error during Google authentication' });
  }
};

exports.appleAuth = async (req, res) => {
  try {
    const { identityToken, authorization, user: appleUserObj, email: directEmail, name: directName } = req.body;
    let email = directEmail;
    let full_name = directName;
    let apple_id = null;

    const tokenString = identityToken || (authorization && authorization.id_token);
    if (tokenString && typeof tokenString === 'string') {
      try {
        const parts = tokenString.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) email = payload.email;
          if (payload.sub) apple_id = payload.sub;
        }
      } catch (e) {
        console.warn('Error parsing Apple JWT token:', e.message);
      }
    }

    if (appleUserObj) {
      if (appleUserObj.email && !email) email = appleUserObj.email;
      if (appleUserObj.name) {
        const firstName = appleUserObj.name.firstName || '';
        const lastName = appleUserObj.name.lastName || '';
        if (firstName || lastName) full_name = `${firstName} ${lastName}`.trim();
      }
    }

    if (!email && apple_id) {
      email = `apple_${apple_id.substring(0, 10)}@privaterelay.appleid.com`;
    }

    if (!email) {
      return res.status(400).json({
        error_ar: 'تعذر الحصول على معلومات الحساب من Apple ID',
        error_en: 'Could not retrieve account info from Apple ID'
      });
    }

    email = email.trim().toLowerCase();
    full_name = (full_name || email.split('@')[0]).trim();

    let user = await db.getAsync('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user) {
      const usernamePrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      let baseUsername = usernamePrefix || `apple_user_${Date.now()}`;
      let usernameCandidate = baseUsername;
      
      const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [usernameCandidate]);
      if (existingUser) {
        usernameCandidate = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const randomPassword = bcrypt.hashSync(Math.random().toString(36) + Date.now().toString(), 10);
      const insertResult = await db.runAsync(
        "INSERT INTO users (username, password, role, permissions, phone, email, full_name) VALUES (?, ?, 'user', '[]', '', ?, ?)",
        [usernameCandidate, randomPassword, email, full_name]
      );

      user = {
        id: insertResult.lastID,
        username: usernameCandidate,
        role: 'user',
        permissions: '[]',
        phone: '',
        email,
        full_name
      };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message_ar: `مرحباً بك، ${user.full_name || user.username}!`,
      message_en: `Welcome, ${user.full_name || user.username}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : (user.permissions || [])
      }
    });
  } catch (err) {
    console.error('Apple auth error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تسجيل الدخول عبر Apple ID', error_en: 'Server error during Apple authentication' });
  }
};

// --- Google Play Policy Compliant: Self-Service Account & Data Deletion ---
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error_ar: 'غير مصرح', error_en: 'Unauthorized' });
    }

    // Safety: Prevent deleting super admin
    const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error_ar: 'المستخدم غير موجود', error_en: 'User not found' });
    }

    if (user.role === 'admin' && (user.username === 'husseinmassara' || user.username === 'city-hunter')) {
      return res.status(403).json({
        error_ar: 'لا يمكن حذف حساب المدير الرئيسي للمتجر',
        error_en: 'Main super admin account cannot be deleted'
      });
    }

    // 1. Delete user cart
    try {
      await db.runAsync('DELETE FROM user_carts WHERE user_id = ?', [userId]);
    } catch (e) {
      console.warn('Cart cleanup note:', e.message);
    }

    // 2. Anonymize orders (keep accounting totals intact without personal identifying info)
    try {
      await db.runAsync("UPDATE orders SET customer_phone = 'Deleted User', customer_name = 'Deleted Account' WHERE user_id = ?", [userId]);
    } catch (e) {
      console.warn('Order unlink note:', e.message);
    }

    // 3. Delete user record
    await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message_ar: 'تم حذف حسابك وجميع بياناتك الشخصية بنجاح.',
      message_en: 'Your account and personal data have been permanently deleted.'
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error_ar: 'حدث خطأ أثناء حذف الحساب', error_en: 'Error occurred while deleting account' });
  }
};

// Public Account Deletion Request (For web users / Google Play policy compliance)
exports.requestAccountDeletion = async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier) {
      return res.status(400).json({
        error_ar: 'يرجى إدخال اسم المستخدم، البريد الإلكتروني، أو رقم الهاتف المسجل',
        error_en: 'Please provide your registered username, email, or phone number'
      });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, '');

    let user = await db.getAsync(`
      SELECT * FROM users 
      WHERE LOWER(username) = ? 
         OR LOWER(email) = ? 
         OR phone = ?
    `, [cleanId, cleanId, identifier.trim()]);

    if (!user && cleanDigits.length >= 7) {
      user = await db.getAsync('SELECT * FROM users WHERE phone LIKE ?', [`%${cleanDigits.slice(-7)}`]);
    }

    if (!user) {
      return res.status(404).json({
        error_ar: 'لم يتم العثور على أي حساب مسجل بهذه البيانات',
        error_en: 'No registered account found with these details'
      });
    }

    if (user.role === 'admin' && (user.username === 'husseinmassara' || user.username === 'city-hunter')) {
      return res.status(403).json({
        error_ar: 'لا يمكن حذف حساب المدير الرئيسي للمتجر',
        error_en: 'Main super admin account cannot be deleted'
      });
    }

    // If password provided, verify it
    if (password && user.password) {
      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          error_ar: 'كلمة المرور غير صحيحة للتأكيد',
          error_en: 'Incorrect password for verification'
        });
      }
    }

    // Perform deletion
    try {
      await db.runAsync('DELETE FROM user_carts WHERE user_id = ?', [user.id]);
    } catch (e) {}

    try {
      await db.runAsync("UPDATE orders SET customer_phone = 'Deleted User', customer_name = 'Deleted Account' WHERE user_id = ?", [user.id]);
    } catch (e) {}

    await db.runAsync('DELETE FROM users WHERE id = ?', [user.id]);

    res.json({
      success: true,
      message_ar: 'تم تأكيد طلبك وحذف الحساب وكافة البيانات المرتبطة به بنجاح.',
      message_en: 'Your account deletion request has been processed and your data has been deleted.'
    });
  } catch (err) {
    console.error('Public deletion request error:', err);
    res.status(500).json({ error_ar: 'حدث خطأ أثناء معالجة الطلب', error_en: 'Error processing deletion request' });
  }
};
