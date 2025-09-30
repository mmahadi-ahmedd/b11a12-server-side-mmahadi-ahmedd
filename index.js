const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");


dotenv.config();

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY)

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
        const donationsCollection = db.collection("donations");
        const paymentsCollection = db.collection("payments");
        const requestsCollection = db.collection("donationRequests"); // stores charity donation requests
        const favoritesCollection = db.collection("favorites"); // stores user's favorite donations
        const reviewsCollection = db.collection("reviews"); // stores reviews for donations




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


        // ✅ Get a single user by email
        app.get("/api/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const user = await usersCollection.findOne({ email });

                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }

                res.json(user);
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).json({ message: "Server error" });
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
                    paymentStatus: "Unpaid",
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



        // GET existing request for a user
        app.get("/api/charity-requests/:email", async (req, res) => {
            const email = req.params.email;
            const request = await charityRequests.findOne({ email });
            if (!request) {
                return res.status(404).json({ message: "No request found" });
            }
            res.json(request);
        });


        // 🔹 Get charity request by ID
        app.get("/api/charityrequests/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const request = await charityRequests.findOne(query);

                if (!request) {
                    return res.status(404).json({ message: "Charity request not found" });
                }

                res.json(request);
            } catch (error) {
                console.error("Error fetching charity request:", error);
                res.status(500).json({ message: "Internal server error" });
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


        // 📌 Add Donation (Restaurant)
        app.post("/api/donations", async (req, res) => {
            try {
                const donation = req.body;
                donation.status = "Pending"; // default status
                donation.createdAt = new Date();

                const result = await donationsCollection.insertOne(donation);
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to add donation", error: err });
            }
        });

        // 📌 Get all donations (for verification / admin etc.)
        app.get("/api/donations", async (req, res) => {
            try {
                const donations = await donationsCollection.find().toArray();
                res.send(donations);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch donations", error: err });
            }
        });


        // 📌 Get all donations by restaurant email
        app.get("/api/my-donations/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const donations = await donationsCollection.find({ restaurantEmail: email }).toArray();
                res.send(donations);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch donations", error: err });
            }
        });


        // 📌 Verify a donation
        app.patch("/api/donations/verify/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await donationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "Verified" } }
                );
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to verify donation", error: err });
            }
        });


        // 📌 Reject a donation
        app.patch("/api/donations/reject/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await donationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: "Rejected" } }
                );
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to reject donation", error: err });
            }
        });

        // 📌 Get all verified donations (for admin to feature)
        app.get("/api/verified-donations", async (req, res) => {
            try {
                const donations = await donationsCollection.find({ status: "Verified" }).toArray();
                res.send(donations);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch verified donations", error: err });
            }
        });




        // --- Fetch donation details by ID ---
        app.get("/api/donations/:id", async (req, res) => {
            try {
                const donationId = req.params.id;
                const donation = await donationsCollection.findOne({ _id: new ObjectId(donationId) });
                if (!donation) return res.status(404).send({ message: "Donation not found" });
                res.send(donation);
            } catch (err) {
                res.status(500).send({ message: "Error fetching donation details", error: err });
            }
        });


        // --- Request a donation (Charity only) ---
        app.post("/api/donations/:id/request", async (req, res) => {
            try {
                const donationId = req.params.id;
                const { charityName, charityEmail, description, pickupTime } = req.body;

                // Prevent duplicate requests
                const existingRequest = await requestsCollection.findOne({
                    donationId,
                    charityEmail,
                });

                if (existingRequest) {
                    return res.status(400).send({ message: "You have already requested this donation" });
                }

                const request = {
                    donationId,
                    charityName,
                    charityEmail,
                    description,
                    pickupTime,
                    status: "Pending",
                    createdAt: new Date(),
                };

                await requestsCollection.insertOne(request);
                res.send({ message: "Donation request submitted successfully", request });
            } catch (err) {
                res.status(500).send({ message: "Error submitting request", error: err });
            }
        });



        // --- Add donation to favorites ---
        app.post("/api/donations/:id/favorite", async (req, res) => {
            try {
                const donationId = req.params.id;
                const { userEmail } = req.body;

                const exists = await favoritesCollection.findOne({ donationId, userEmail });
                if (exists) return res.status(400).send({ message: "Already in favorites" });

                await favoritesCollection.insertOne({ donationId, userEmail, createdAt: new Date() });
                res.send({ message: "Added to favorites" });
            } catch (err) {
                res.status(500).send({ message: "Error adding favorite", error: err });
            }
        });


        // --- Add review ---
        app.post("/api/donations/:id/review", async (req, res) => {
            try {
                const donationId = req.params.id;
                const { reviewerName, reviewerEmail, description, rating } = req.body;

                const review = {
                    donationId,
                    reviewerName,
                    reviewerEmail,
                    description,
                    rating,
                    createdAt: new Date(),
                };

                await reviewsCollection.insertOne(review);
                res.send({ message: "Review added successfully", review });
            } catch (err) {
                res.status(500).send({ message: "Error adding review", error: err });
            }
        });


        // --- Get all reviews for a donation ---
        app.get("/api/donations/:id/reviews", async (req, res) => {
            try {
                const donationId = req.params.id;
                const reviews = await reviewsCollection.find({ donationId }).sort({ createdAt: -1 }).toArray();
                res.send(reviews);
            } catch (err) {
                res.status(500).send({ message: "Error fetching reviews", error: err });
            }
        });






        // 📌 Mark a donation as Featured
        app.patch("/api/donations/feature/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await donationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { featured: true } }
                );
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: "Failed to feature donation", error: err });
            }
        });


        // 📌 Get featured donations (for Home page)
        app.get("/api/featured-donations", async (req, res) => {
            try {
                const featured = await donationsCollection.find({ featured: true, status: "Verified" }).toArray();
                res.send(featured);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch featured donations", error: err });
            }
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




        // Payment APIs


        app.post('/create-payment-intent', async (req, res) => {
            const amountInCents = req.body.amountInCents


            try {
                const paymentIntent = await stripe.paymentIntents.create(
                    {
                        amount: amountInCents,
                        currency: 'usd',
                        payment_method_types: ['card'],
                    }
                );
                res.json({ clientSecret: paymentIntent.client_secret });

            }
            catch (error) {
                res.status(500).json({ error: error.message })
            }
        });



        // Update payment status & save payment history
        app.post("/api/payments", async (req, res) => {
            try {
                const { reqId, transactionId, amount, email } = req.body;

                // Update charity request paymentStatus
                await charityRequests.updateOne(
                    { _id: new ObjectId(reqId) },
                    { $set: { paymentStatus: "Paid", transactionId } }
                );

                // Save payment record
                const payment = {
                    reqId: new ObjectId(reqId),
                    transactionId,
                    amount,
                    email,
                    date: new Date(),
                };
                await paymentsCollection.insertOne(payment);

                res.json({ message: "Payment successful & recorded", payment });
            } catch (error) {
                console.error("Error saving payment:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        });

        // Get payment history for user
        app.get("/api/payments/:email", async (req, res) => {
            const email = req.params.email;
            const payments = await paymentsCollection.find({ email }).toArray();
            res.json(payments);
        });

        // Get all payment history (admin)
        app.get("/api/payments", async (req, res) => {
            const payments = await paymentsCollection.find().toArray();
            res.json(payments);
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
