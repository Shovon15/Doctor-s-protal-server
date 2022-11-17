const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config(); //it's important.always check this for env.

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.jallqro.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

async function run() {
    try {
        const appointmentOptionsCollection = client.db("doctorsPortal").collection("appointOptions");
        const bookingsCollection = client.db("doctorsPortal").collection("bookings");
        const usersCollection = client.db("doctorsPortal").collection("users");

        // -------------------appointment options get from db--------------------------
        app.get("/appointmentOptions", async (req, res) => {
            const date = req.query.date;
            // console.log(date);
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            // tricky--------------
            options.forEach((option) => {
                const optionBooked = alreadyBooked.filter((book) => book.treatment === option.name);
                // console.log(optionBooked);
                const bookedSlots = optionBooked.map((book) => book.slot);
                const remainingSlots = option.slots.filter((slot) => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
                // console.log(date, option.name, bookedSlots);
                // console.log(date, option.name, remainingSlots.length);
            });
            res.send(options);
        });

        //  ---------------------appointment booking get from db--------------
        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            console.log(email);
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        //  ---------------------appointment booking post add to db--------------
        app.post("/bookings", async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment,
            };

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.appointmentDate}`;
                return res.send({ acknowledged: false, message });
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        //  ----create user Add to db---------------
        app.post("/users", async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
    } finally {
    }
}
run();

// --------------------------------------
app.get("/", async (req, res) => {
    res.send("doctors portal server is running");
});

app.listen(port, () => console.log(`Doctors portal running on ${port}`));
