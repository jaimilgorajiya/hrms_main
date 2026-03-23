import mongoose from "mongoose";

const resignationSchema = new mongoose.Schema({
    employeeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    reason: { 
        type: String, 
        required: true 
    },
    noticeDate: { 
        type: Date, 
        default: Date.now 
    },
    lastWorkingDay: { 
        type: Date 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    },
    comments: { 
        type: String 
    }
}, {
    timestamps: true
});

const Resignation = mongoose.model("Resignation", resignationSchema);

export default Resignation;
