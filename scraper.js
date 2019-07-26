const axios = require("axios")
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const express = require('express')

function connect() {
    return new Promise((resolve, reject) => {
        const mongoUrl = "mongodb://scraper:scraper12@ds255577.mlab.com:55577/heroku_8jvlbt26";
        const db = mongoose.connection;
        db.on('error', reject);
        db.once('open', resolve);
        mongoose.connect(mongoUrl, {useNewUrlParser: true, keepAlive: true});

    });
}

const Occupancy = mongoose.model("Occupancy", new mongoose.Schema({
    lotId: Number,
    occupancy: Number,
    date: Date,
}));

function persist(status) {
    return new Promise((resolve, reject) => {
        status.save(function (err) {
            if (err) {
                reject(err)
            } else {
                resolve();
            }
        });
    })
}

async function scrapeStatus(lotId) {
    const url = "http://www.ahuzot.co.il/Parking/ParkingDetails/?ID=";

    const response = await axios.get(url + lotId);
    const prefix = "/pics/ParkingIcons/";
    const $ = cheerio.load(response.data);
    const statusImg = $(`.ParkingDetailsTable img[src*="${prefix}"]`);
    const src = statusImg.attr("src").substring(prefix.length);
    const occupancy = (image => {
        switch (image) {
            case "male.png":
                return 100;
            case "meat.png":
                return 90;
            case "panui.png":
                return 0;
        }
    })(src);
    return new Occupancy({lotId, occupancy, date: new Date()});
}

function tick() {
    (async function () {
        const lotId = 122;

        const status = await scrapeStatus(lotId);
        await persist(status);
        console.log("recorded status", status);

    })();
}

(async function main() {

    await connect();

    setInterval(tick, 1000 * 60 * 5);

    const app = express();

    app.listen(process.env.PORT);

})();
