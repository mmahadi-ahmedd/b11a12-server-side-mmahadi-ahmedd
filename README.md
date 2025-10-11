# Harvest — Server Side

This repository contains the backend source code for the **Local Food Waste Reduction Platform**, a MERN stack project designed to reduce food waste by connecting restaurants with surplus food to charities and users who can help distribute it.  
The backend provides secure REST APIs for authentication, donations, transactions, and role-based dashboards.

---

## Live API
**Base URL:** [https://harvest-server.vercel.app](https://harvest-server.vercel.app)

---

## Overview

The backend is built using **Node.js**, **Express.js**, and **MongoDB**.  
It supports multiple user roles — **Admin**, **Restaurant**, **Charity**, and **General User** — with role-based access and authorization using **JWT**.  
The server also handles **Stripe payment integration**, **CRUD operations**, and **secure data management**.

---

## Core Features

- RESTful API architecture with modular controllers  
- JWT authentication for secured private routes  
- Role-based access control for Admin, Charity, and Restaurant users  
- Stripe payment integration for Charity role requests  
- Donation lifecycle management (Available → Requested → Picked Up)  
- Request and review management endpoints  
- Secure use of environment variables for sensitive data  
- Data validation and error handling for all routes  

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `POST` | `/jwt` | Generate access token for authenticated users |
| `POST` | `/logout` | Invalidate user session |

### Users
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/users` | Retrieve all users (Admin only) |
| `POST` | `/users` | Create a new user record |
| `PATCH` | `/users/role/:email` | Update user role |
| `DELETE` | `/users/:id` | Remove a user (Admin only) |

### Donations
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/donations` | Get all verified donations |
| `GET` | `/donations/:id` | Get details of a specific donation |
| `POST` | `/donations` | Add new donation (Restaurant only) |
| `PUT` | `/donations/:id` | Update donation details |
| `DELETE` | `/donations/:id` | Delete donation entry |

### Requests
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/requests` | Retrieve all donation requests |
| `POST` | `/requests` | Submit a new request (Charity only) |
| `PATCH` | `/requests/status/:id` | Update request status (Restaurant/Admin) |
| `DELETE` | `/requests/:id` | Delete a request record |

### Payments
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `POST` | `/create-payment-intent` | Generate Stripe payment intent for Charity role request |
| `POST` | `/transactions` | Save transaction details after successful payment |
| `GET` | `/transactions/:email` | Retrieve transactions for a specific user |

### Reviews
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/reviews/:donationId` | Get all reviews for a donation |
| `POST` | `/reviews` | Add a new review |
| `DELETE` | `/reviews/:id` | Delete a review by ID |

---

## Technologies Used

| Category | Technology |
|-----------|-------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| Authentication | JWT (jsonwebtoken) |
| Payment | Stripe |
| Environment Management | dotenv |
| CORS Handling | cors |
| Others | cookie-parser, nodemon (dev) |

---

## Environment Variables

Create a `.env` file in the root of the project and include the following variables:

```
PORT=5000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
ACCESS_TOKEN_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
CLIENT_URL=https://harvest-41197.web.app
> Ensure `.env` is added to `.gitignore` to protect credentials.

---

## Project Structure

server/
├── src/
│ ├── routes/
│ │ ├── users.routes.js
│ │ ├── donations.routes.js
│ │ ├── requests.routes.js
│ │ ├── payments.routes.js
│ │ └── reviews.routes.js
│ ├── controllers/
│ ├── middleware/
│ │ ├── verifyJWT.js
│ │ └── verifyRole.js
│ ├── utils/
│ └── config/
│ └── db.js
├── .env
├── package.json
└── server.js


---

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/food-waste-server.git
   cd food-waste-server
2.Install dependencies
npm install

3.Add your environment variables
Create a .env file using the example above.

4.Run the server (development mode)
npm run dev

5.Server will start at
http://localhost:5000

Deployment
Deployed using Vercel.

Ensure the following:
MongoDB connection string is correctly set for production.
CORS configured for your client domain.
Stripe secret key added in the environment variables.

