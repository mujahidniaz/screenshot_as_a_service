var mysql = require('mysql');

// create a connection variable with the required details
var connection = mysql.createConnection({
    host: "127.0.0.1", // ip address of server running mysql
    user: "test", // user name to your mysql database
    password: "test", // corresponding password
    database: "screenshot" // use the specified database
  });


  connection.connect((err) => {
    if (err) throw err;
    console.log('Connection Connected!');
  });


  queryRow = function(id){
    let sql = "SELECT * FROM screenshots WHERE id = "+ mysql.escape(id);
    return new Promise(function(resolve, reject){
      connection.query(sql, 
          function(err, rows){                                                
              if(rows === undefined){
                  reject(new Error("Error rows is undefined"));
              }else{
                resolve(JSON.stringify(rows));
              }
          }
      )}
  )}


  addRow = function(data){
    return new Promise(function(resolve, reject){
      connection.query('INSERT INTO screenshots SET ?', data,
          function(err, rows){                                                
              if(rows === undefined){
                  reject(new Error("Error rows is undefined"));
              }else{
                  resolve(rows);
              }
          }
      )}
  )}


module.exports = {
   addRow,
   queryRow
  };