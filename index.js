const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const mongoose = require("mongoose");
const compression = require("compression");
const path = require("path");
const socketio = require("socket.io");
const jwt = require("jwt-simple");

const apiRouter = require("./routes");

const app = express();
const PORT = process.env.PORT || 9000;

if (process.env.NODE_ENV !== "production") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
  require("dotenv").config();
}

app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(cors());
app.use(bodyParser.json());
app.set("trust proxy", 1);
app.use("/api", apiRouter);

if (process.env.NODE_ENV === "production") {
  app.use(compression());
  app.use(express.static(path.join(__dirname, "client/build")));

  app.get("*", function (req, res) {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test'
const mongooseConfig = { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }
mongoose.connect(MONGODB_URI, mongooseConfig, error => console.log(error || '--> Connected to Database'))


const expressServer = app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

const io = socketio(expressServer);
app.set("socketio", io);
console.log("Socket.io listening for connections");

// Authenticate before establishing a socket connection
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (token) {
    try {
      const user = jwt.decode(token, process.env.JWT_SECRET);
      if (!user) {
        return next(new Error("Not authorized."));
      }
      socket.user = user;
      return next();
    } catch (err) {
      next(err);
    }
  } else {
    return next(new Error("Not authorized."));
  }
}).on("connection", (socket) => {
  socket.join(socket.user.id);
  console.log("socket connected:", socket.id);
});
