import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
    {
        designationCode: {
            type: String,
            required: true
        },
        designationName: {
            type: String,
            required: true
        },
        designationAlias: {
            type: String
        },
        jobDescription: {
            type: String
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Unique designation name per admin
designationSchema.index({ adminId: 1, designationName: 1 }, { unique: true });
// Unique designation code per admin
designationSchema.index({ adminId: 1, designationCode: 1 }, { unique: true });

const Designation = mongoose.model("Designation", designationSchema);

export default Designation;
