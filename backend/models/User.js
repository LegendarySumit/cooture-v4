const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email:    { type: String, required: true, unique: true },
    password: { type: String, default: null },   // null for OAuth-only users
    name:     { type: String, default: "" },
    avatar:   { type: String, default: "" },
    googleId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
