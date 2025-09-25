const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.onlhyrw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();








        const db = client.db("harvestDB"); // use your DB name
        const charityRequests = db.collection("charityRequests");

        // --- Save charity request ---
        app.post("/api/charity-requests", async (req, res) => {
            try {
                const { name, email, organizationName, mission, amount } = req.body;
                const newRequest = {
                    name,
                    email,
                    organizationName,
                    mission,
                    amount,
                    status: "Pending",
                    createdAt: new Date()
                };
                const result = await charityRequests.insertOne(newRequest);
                res.status(201).json({ message: "Charity request submitted", data: result });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Server error" });
            }
        });

        // --- Get all charity requests (for admin) ---
        app.get("/api/charity-requests", async (req, res) => {
            try {
                const requests = await charityRequests.find().sort({ createdAt: -1 }).toArray();
                res.json(requests);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Server error" });
            }
        });

        // 🟢 Get a charity profile by email
        app.get("/api/charity/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const charity = await charityRequests.findOne({ email, status: "Approved" });
                if (!charity) {
                    return res.status(404).json({ message: "Charity not found or not approved yet" });
                }
                res.json(charity);
            } catch (err) {
                console.error("❌ Error fetching charity profile:", err);
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });

        // (optional) Admin: get all charities
        app.get("/api/charities", async (req, res) => {
            try {
                const charities = await charityRequests.find({ status: "Approved" }).toArray();
                res.json(charities);
            } catch (err) {
                console.error("❌ Error fetching charities:", err);
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });






        // --- Get requests by email (for user dashboard) ---
        app.get("/api/charity-requests/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const requests = await charityRequests.find({ email }).toArray();
                res.json(requests);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Server error" });
            }
        });

        console.log("✅ MongoDB connected & API routes ready");
    } catch (err) {
        console.error("❌ DB connection error:", err);














        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('harvest server is running');
});

app.listen(port, () => {
    console.log(`Server is listeningon ${port}`)
});
