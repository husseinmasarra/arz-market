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
