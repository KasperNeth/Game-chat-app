const express = require("express")
const path = require("path")
const helmet = require("helmet")
const compression = require("compression")
const cors = require("cors")


const app = express()


app.use(helmet())
app.use(cors("*"));
app.use(compression());
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json())


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

module.exports = app

