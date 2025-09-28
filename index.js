const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');
const admin = require("firebase-admin");


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());




const serviceAccount = require("./firebase-admin-key");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});






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
        const usersCollection = db.collection('users');



        // Custom Middlewares

        const verifyFBToken = async (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            try {
                const decoded = await admin.auth().verifyIdToken(token);
                req.decoded = decoded;
                next();
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }



        }



        // Users  API


        // 📌 Get all users
        app.get("/api/users", async (req, res) => {
            try {
                const users = await usersCollection.find().toArray();
                res.send(users);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch users", error: err });
            }
        });


        app.post('/users', async (req, res) => {
            const email = req.body.email;
            const userExists = await usersCollection.findOne({ email })
            if (userExists) {

                return res.status(200).send({
                    message: 'User already exists',
                    inserted: false
                });
            }
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);

        })




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



        // 📌 Make Charity
        app.patch("/api/users/:id/make-charity", async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: "Charity" } }
            );
            res.send(result);
        });

        // --- Get all charity requests (for admin) ---
        app.get("/api/admin/charity-requests", verifyFBToken, async (req, res) => {
            try {
                const requests = await charityRequests.find().sort({ createdAt: -1 }).toArray();
                res.json(requests);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Server error" });
            }
        });


        // 🟢 Approve request
        app.patch("/api/admin/charity-requests/:id/approve", async (req, res) => {
            try {
                const id = req.params.id;
                const { ObjectId } = require("mongodb");
                const result = await charityRequests.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "Approved" } }
                );
                res.json({ message: "Charity request approved", result });
            } catch (err) {
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });



        // 🟢 Reject request
        app.patch("/api/admin/charity-requests/:id/reject", async (req, res) => {
            try {
                const id = req.params.id;
                const { ObjectId } = require("mongodb");
                const result = await charityRequests.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "Rejected" } }
                );
                res.json({ message: "Charity request rejected", result });
            } catch (err) {
                res.status(500).json({ message: "Server error", error: err.message });
            }
        });



        // 🟢 Get a charity profile by email
        app.get("/api/charity/:email", verifyFBToken, async (req, res) => {
            try {
                const email = req.params.email;
                if (req.decoded.email !== email) {
                    return res.status(403).send({
                        message: 'forbidden access'
                    })
                }


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


        // 📌 Make Admin
        app.patch("/api/users/:id/make-admin", async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: "Admin" } }
            );
            res.send(result);
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






        // Restaurent APIs

        // 📌 Make Restaurant
        app.patch("/api/users/:id/make-restaurant", async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: "Restaurant" } }
            );
            res.send(result);
        });




        // User APIS


        // 📌 Delete User
        app.delete("/api/users/:id", async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
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

        // 📌 Get single user by email
        app.get("/api/users/:email", async (req, res) => {
            const email = req.params.email;
            try {
                const user = await usersCollection.findOne({ email: email });
                res.send(user);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch user", error: err });
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
