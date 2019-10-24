const express = require('express');
const app = express();
const http = require('http');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const helper = require('./helper');
const mysql = require('./sqlconnect');
const path = require('path');


// Middleware
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'images')));
//app.use(express.static("/Users/af186032/Documents/async-microservices-demo/processor-service"));

// simulate request ids
let lastRequestId = 1;

let connection = null;
let channel = null;
const parentFolder = "images"

// RabbitMQ connection string
//const messageQueueConnectionString = "amqp://epmspuzc:yjJ6q8eS9MHnlkeHgSQtNwpahDofRraY@mustang.rmq.cloudamqp.com/epmspuzc";
const messageQueueConnectionString = "amqp://localhost";
async function createConnection() {
  connection = await amqp.connect(messageQueueConnectionString);
  channel = await connection.createConfirmChannel();
}



// handle the request
app.post('/api/v1/screenshot', async function (req, res) {
  // save request id and increment
  //let requestId = lastRequestId;
  //lastRequestId++;

  let requestId = helper.getUniqueID();

  // connect to Rabbit MQ and create a channel
  //let connection = await amqp.connect(messageQueueConnectionString);
 // let channel = await connection.createConfirmChannel();

  // publish the data to Rabbit MQ
  let requestData = req.body.url;
  console.log("Published a request message, requestId:", requestId, requestData);
  await publishToChannel(channel, {
    routingKey: "request",
    exchangeName: "processing",
    data: {
      requestId,
      requestData
    }
  });

  // send the request id in the response

  let response = {
    status: "success",
    requestId: requestId
  }
  // res.send({ requestId })
  res.send(response);

});


app.get("/api/v1/getScreenshot/:id", async (req, res) => {

  console.log('in GetScreenshot')
  //console.log(req)
  let id = req.params.id;
  let response = [];
  await mysql.queryRow(id).then(function (results) {
      console.log(results);
      console.log(JSON.parse(results));
      
      results =JSON.parse(results);
      
      results.forEach(function (item) {
        let link = "http://"+ req.get('host') + "/"+ item.filepath + ".png";
        let row = {
          url: item.url,
          link: link,
          requestId: item.id
        }
        response.push(row);

     });
    })
    .catch(function (err) {
      console.log("Promise rejection error: " + err);
    })




  console.log(response);
  res.json(response);
});


// utility function to publish messages to a channel
function publishToChannel(channel, {
  routingKey,
  exchangeName,
  data
}) {
  return new Promise((resolve, reject) => {
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data), 'utf-8'), {
      persistent: true
    }, function (err, ok) {
      if (err) {
        return reject(err);
      }

      resolve();
    })
  });
}


async function listenForResults() {
  // connect to Rabbit MQ
  let connection = await amqp.connect(messageQueueConnectionString);

  // create a channel and prefetch 1 message at a time
  let channel = await connection.createChannel();
  await channel.prefetch(1);

  // start consuming messages
  await consume({
    connection,
    channel
  });
}


// consume messages from RabbitMQ
function consume({
  connection,
  channel,
  resultsChannel
}) {
  return new Promise((resolve, reject) => {
    channel.consume("processing.results", async function (msg) {
      // parse message
      let msgBody = msg.content.toString();
      let data = JSON.parse(msgBody);
      let requestId = data.requestId;
      let processingResults = data.processingResults;
      console.log("Received a result message, requestId:", requestId, "processingResults:", processingResults);

      // acknowledge message as received
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

// Start the server
const PORT = 3000;
server = http.createServer(app);
server.listen(PORT, "localhost", function (err) {
  if (err) {
    console.error(err);
  } else {
    console.info("Listening on port %s.", PORT);
  }
});

// listen for results on RabbitMQ
createConnection();
listenForResults();