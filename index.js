const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

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
        const doctorsCollection = client.db("doctorsPortal").collection("doctors");

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

        //  ---------------------appointment specialty------------------------------------------------
        app.get("/appointmentSpecialty", async (req, res) => {
            const query = {};
            const result = await appointmentOptionsCollection.find(query).project({ name: 1 }).toArray();
            res.send(result);
        });

        //  ---------------------appointment booking get from db------------------------------------------------
        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            console.log("token", req.headers.authorization); //problem ase----------------------------------------------------------------
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        // ---------------------------------booking payment -------------------------------------
        // app.get("/bookings/:id", async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: ObjectId(id) };
        //     const booking = await bookingsCollection.findOne(query);
        //     res.send(booking);
        // });

        //  ---------------------appointment booking post add to db----------------------------------------------
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

        // ---------------------------admin-----------------------------------

        app.put("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: "admin",
                },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // ----------------------jwt--------------------------------------------------------------
        app.get("/jwt", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            // console.log(user);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "1h" });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: "" });
        });

        // -------------------------------post doctor information into Db--------------------------------
        app.get("/doctors", async (req, res) => {
            const filter = {};
            const result = await doctorsCollection.find(filter).toArray();
            res.send(result);
        });
        app.post("/doctors", async (req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        });

        app.delete("/doctors/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result);
        });

        //  ----create user to Add to db--------------------------------------------------------------------
        app.post("/users", async (req, res) => {
            const user = req.body;
            // console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get("/users", async (req, res) => {
            const filter = {};
            const users = await usersCollection.find(filter).toArray();
            res.send(users);
        });

        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
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
