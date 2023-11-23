import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadFileCloud} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler( async(req,res) => {
 //get user detailed from frontend
 //validation--not empty
 //check if user already exits: username,email
 //check for images and avator
 //upload them to cloudinary,avator 
 //create user object- create entry in db
 //remove password and refresh token field from response
 //check for user creation 
 //return response  

const {fullName,email , username , password} = req.body

if (
    [fullName,email,username,password].some((field) =>
    field?.trim() === "")
) {
throw new ApiError(400,"all field is required")
}

const existedUser = User.findOne({
    $or: [{username},{email}]
})

if (existedUser) {
    throw new ApiError(409,"User already exists")
}
const avatorlocalpath =req.files?.avator[0]?.path
const coverimagelocalpath = req.files?.coverimage[0]?.path

if (!avatorlocalpath) {
    throw new ApiError(400,"avator image is must required")
}

const avator = await uploadFileCloud(avatorlocalpath)
const coverimage =  await uploadFileCloud(coverimagelocalpath)

if (!avator) {
    throw new ApiError(400 , "avator image is required")
}

const user =  await User.create({
    fullName,
    avator: avator.url,
    coverimage: coverimage?.url || "",
    password,
    email,
    username: username.toLowerCase()
})
const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
)
if (!createdUser) {
    throw new ApiError(500, "something went wrong")
} 

return res.status(201).json(
    new ApiResponse(200, createdUser , "User register successfully")
)


})

export {
    registerUser,
}