const { validationResult } = require("express-validator");

const HttpError = require("../util/http-error");
const getCoordsForAddress = require("../util/location");
const PlaceModel = require("../models/placeModel");
const UserModel = require("../models/userModel");
const { default: mongoose } = require("mongoose");
const userModel = require("../models/userModel");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await PlaceModel.findById(placeId);
  } catch (error) {
    return next(error);
  }

  if (!place) {
    throw new HttpError("Could not find a place for the provided id.", 404);
  }

  res.json({ place }); // => { place } => { place: place }
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try {
    places = await PlaceModel.find({ creator: userId });
  } catch (error) {
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }

  res.json({ places });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, creator, imageUrl } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  let user;
  try {
    user = await UserModel.findById(creator);
  } catch (error) {
    return next(error);
  }

  if (!user) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const place = new PlaceModel({
    title,
    description,
    location: coordinates,
    address,
    creator: user._id,
    imageUrl,
  });

  let newPlace;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    newPlace = await place.save({ session: session });
    user.places.push(place);
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (error) {
    return next(error);
  }

  res.status(201).json({ place: newPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { title, description } = req.body;

  const placeId = req.params.pid;

  let place;
  try {
    place = await PlaceModel.findById(placeId);
  } catch (error) {
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (error) {
    return next(error);
  }

  res.status(200).json({ place: place });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await PlaceModel.findById(placeId).populate("creator");
  } catch (error) {
    return next(error);
  }

  if (!place) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 500)
    );
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session: session });
    place.creator.places.pull(place);
    await place.creator.save({ session: session });
    session.commitTransaction();
  } catch (error) {
    return next(error);
  }
  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
