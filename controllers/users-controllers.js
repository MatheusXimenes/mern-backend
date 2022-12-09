const bcrypt = require("bcrypt");

const HttpError = require("../util/http-error");
const UserModel = require("../models/userModel");

const getUsers = async (req, res, next) => {
  const users = await UserModel.find({}, "-password");
  res.json({ users: users });
};

const signup = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (
    !name ||
    name.trim() === "" ||
    !email ||
    email.trim() === "" ||
    !password ||
    password.trim() === ""
  ) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  let existingUser;
  try {
    existingUser = await UserModel.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
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

  res.status(201).json(savedUser.toObject({ getters: true, virtuals: false }));
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  const identifiedUser = await UserModel.findOne({ email: email });
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
  const user = identifiedUser.toObject();
  delete user.password;
  res.json(user);
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
