# SoftDev_EventMng
Event Management Project for SoftDev class

## Getting Started

Follow these steps to run the project on your local machine after downloading and extracting the zip file from GitHub:

### 1. Install Node.js and npm
- Download and install Node.js (which includes npm) from [nodejs.org](https://nodejs.org/).
- To check installation, open a terminal/command prompt and run:
  ```sh
  node -v
  npm -v
  ```

### 2. Install MongoDB
- Download and install MongoDB Community Edition from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
- Start the MongoDB server (usually by running `mongod` in a terminal).

### 3. Extract the Project
- Unzip the downloaded project folder.
- Open a terminal/command prompt and navigate to the project directory:
  ```sh
  cd path/to/project-folder
  ```

### 4. Install Dependencies
- In the project directory, run:
  ```sh
  npm install
  ```
  This installs all required packages listed in `package.json`.

### 5. Set Up Environment Variables
- If there's a `.env.example` file, copy it to `.env` and fill in any required values (like MongoDB connection string, session secret, etc.).
  ```sh
  cp .env.example .env
  ```
- Edit `.env` with a text editor to set the correct values.

### 6. Start the Application
- Run the app with:
  ```sh
  npm start
  ```
  or, if you use nodemon for development:
  ```sh
  npm run dev
  ```

### 7. Access the App
- Open a browser and go to [http://localhost:3000](http://localhost:3000) (or whatever port is specified in your `.env`).

### 8. (Optional) Create an Admin Account
- If your app requires an admin account, follow the instructions you provided (e.g., visit `/create-admin` route once to create the default admin).

## Troubleshooting
- If you get errors about missing dependencies, make sure you ran `npm install`.
- If MongoDB connection fails, check that MongoDB is running and the connection string in `.env` is correct.
- If you see permission errors, try running the terminal as administrator.
