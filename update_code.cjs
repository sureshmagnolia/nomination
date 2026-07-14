const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf-8');

const newCheckAdmin = `function checkAdmin(reqData, isLogin = false) {
  const pwd = typeof reqData === 'string' ? reqData : (reqData.password || reqData);
  const token = reqData.sessionToken;
  // Generate dynamic password based on current date in India (Asia/Kolkata)
  // Format: ddmmyyyyday (e.g., 29042026wednesday)
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Kolkata", "ddMMyyyy");
  const dayStr = Utilities.formatDate(now, "Asia/Kolkata", "EEEE").toLowerCase();
  const dynamicPassword = dateStr + dayStr;

  if (pwd !== dynamicPassword) {
    throw new Error('Invalid admin password.');
  }

  if (!isLogin) {
    const activeToken = PropertiesService.getScriptProperties().getProperty('activeAdminSession');
    if (activeToken && activeToken !== token) {
      throw new Error('SESSION_EXPIRED');
    }
  }
}`;

code = code.replace(/function checkAdmin\(pwd\) \{[\s\S]*?throw new Error\('Invalid admin password\.'\);\n  \}\n\}/, newCheckAdmin);

code = code.replace(/checkAdmin\(e\.parameter\.password\)/g, 'checkAdmin(e.parameter)');
code = code.replace(/checkAdmin\(body\.password\)/g, 'checkAdmin(body)');

const oldAdminLogin = `if (action === 'adminLogin') {
      checkAdmin(body);
      return jsonOut({ ok: true });
    }`;
const newAdminLogin = `if (action === 'adminLogin') {
      checkAdmin(body, true);
      const sessionToken = Utilities.getUuid();
      PropertiesService.getScriptProperties().setProperty('activeAdminSession', sessionToken);
      return jsonOut({ ok: true, sessionToken });
    }`;

code = code.replace(oldAdminLogin, newAdminLogin);

fs.writeFileSync('Code.gs', code);
console.log('Done replacing Code.gs');
