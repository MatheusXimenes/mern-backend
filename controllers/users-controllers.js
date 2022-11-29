const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const UserModel = require("../models/userModel");

const getUsers = async (req, res, next) => {
  const users = await UserModel.find({}, "-password");
  res.json({ users: users });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }
  const { name, email, password } = req.body;

  const hasUser = await UserModel.findOne({ email: email });

  if (hasUser) {
    throw new HttpError("Could not create user, email already exists.", 422);
  }

  const encryptedPassword = await bcrypt
    .hash(password, 12)
    .then((hash) => hash);

  const createdUser = new UserModel({
    name,
    email,
    password: encryptedPassword,
    image: "Some",
    places: [],
  });

  const savedUser = await createdUser.save();

  res
    .status(201)
    .json({ user: savedUser.toObject({ getters: true, virtuals: false }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  const identifiedUser = await UserModel.findOne({ email: email });
  console.log(identifiedUser, password);
  const matchPassword = await bcrypt.compare(password, identifiedUser.password);

  if (!identifiedUser) {
    throw new HttpError(
      "Could not identify user email, credentials seem to be wrong.",
      401
    );
  }

  if (!matchPassword) {
    throw new HttpError(
      "Could not identify user password, credentials seem to be wrong.",
      401
    );
  }

  res.json({ message: "Logged in!" });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
