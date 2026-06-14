const oracledb = require("oracledb");

async function getConnection() {
  return await oracledb.getConnection({
    user: "system",
    password: bhavani2006,
    connectString: "localhost:1521/XEPDB1"
  });
}

module.exports = getConnection;