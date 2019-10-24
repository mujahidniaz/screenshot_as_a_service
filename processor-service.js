const amqp = require('amqplib');
var webshot = require('webshot');

const fs = require('fs');
const path = require('path');
const mysql =require('./sqlconnect');


const parentFolder = "images"
// RabbitMQ connection string
//const messageQueueConnectionString = "amqp://epmspuzc:yjJ6q8eS9MHnlkeHgSQtNwpahDofRraY@mustang.rmq.cloudamqp.com/epmspuzc";
const messageQueueConnectionString = "amqp://localhost";


async function listenForMessages() {
  // connect to Rabbit MQ
  let connection = await amqp.connect(messageQueueConnectionString);

  // create a channel and prefetch 1 message at a time
  let channel = await connection.createChannel();
  await channel.prefetch(1);

  // create a second channel to send back the results
  let resultsChannel = await connection.createConfirmChannel();

  // start consuming messages
  await consume({ connection, channel, resultsChannel });
}

// utility function to publish messages to a channel
function publishToChannel(channel, { routingKey, exchangeName, data }) {
  return new Promise((resolve, reject) => {
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data), 'utf-8'), { persistent: true }, function (err, ok) {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}

// consume messages from RabbitMQ
function consume({ connection, channel, resultsChannel }) {
  return new Promise((resolve, reject) => {
    channel.consume("processing.requests", async function (msg) {
      // parse message
      let msgBody = msg.content.toString();
      let data = JSON.parse(msgBody);
      let requestId = data.requestId;
      let requestData = data.requestData;
      console.log("Received a request message, requestId:", requestId);

      // process data
      let processingResults = await processMessage(requestId,requestData);

      // publish results to channel
      await publishToChannel(resultsChannel, {
        exchangeName: "processing",
        routingKey: "result",
        data: { requestId, processingResults }
      });
      console.log("Published results for requestId:", requestId);

      // acknowledge message as processed successfully
      await channel.ack(msg);
    });

    // handle connection closed
    connection.on("close", (err) => {
      return reject(err);
    });

    // handle errors
    connection.on("error", (err) => {
      return reject(err);
    });
  });
}
function createDirectory(directoryPath) {
  const directory = path.normalize(directoryPath);
  return new Promise((resolve, reject) => {
    fs.stat(directory, (error) => {
      if (error) {
        if (error.code === 'ENOENT') {
          fs.mkdir(directory, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(directory);
            }
          });
        } else {
          reject(error);
        }
      } else {
        resolve(directory);
      }
    });
  });
}
// simulate data processing that takes 5 seconds
var options = {
      
  shotSize: {
     width: 'all',
    height: 'all'
   }
};
async function generateScreenshot(requestId,urls,directoryPath)
{
  let counter  = 1;
  for (var key in urls) {
    console.log(urls[key]);

    let name = requestId +"-"+ counter;
    counter++;
    // await new Pageres()
    // .src(urls[key],['1080x720'],{crop: false,incrementalName: true, filename: name,format: 'jpg'})
    // .dest(directoryPath)
    // .run();

   webshot(urls[key], directoryPath + name +".png",options, function(err) {
      // screenshot now saved to google.png
      console.log(directoryPath + name +".png");
    }); 
  
    let data = {
      id:requestId,
      url:urls[key],
      filepath: requestId +"/"+ name
    }
   // console.log(data);
    await mysql.addRow(data);
  };

}
function processMessage(requestId, requestData) {

  
  let directoryPath = __dirname + "/" + parentFolder + "/" + requestId + '/';
  console.log('-----------' + directoryPath)
  createDirectory(directoryPath).then((path) => {
    console.log("Successfully created directory:" + path);
    generateScreenshot(requestId,requestData,path);
    
   }).catch((error) => {
    console.log(`Problem creating directory: ${error.message}`)
  });
 
  

  // return new Promise((resolve, reject) => {
  //   setTimeout(() => {
  //     resolve(requestData + "-processed")
  //   }, 5000);
  // });
}

listenForMessages();