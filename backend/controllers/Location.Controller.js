import Location from "../models/Location.Model.js";

const getLocations = async (req, res) => {
    try {
        const locations = await Location.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, locations });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in fetching locations" });
    }
};

const addLocation = async (req, res) => {
    try {
        const { name, address, city, state, country, pincode } = req.body;
        const addedBy = req.user.name || req.user.email; // Assuming user is extracted from token middleware

        const newLocation = new Location({
            name,
            address,
            city,
            state,
            country,
            pincode,
            addedBy
        });

        await newLocation.save();
        return res.status(200).json({ success: true, location: newLocation });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in adding location" });
    }
};

const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, state, country, pincode } = req.body;

        const updateLocation = await Location.findByIdAndUpdate({ _id: id }, {
            name, address, city, state, country, pincode
        }, { new: true });

         if (!updateLocation) {
            return res.status(404).json({ success: false, error: "Location not found" });
        }

        return res.status(200).json({ success: true, location: updateLocation });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in updating location" });
    }
};

const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedLocation = await Location.findByIdAndDelete({ _id: id });

        if (!deletedLocation) {
            return res.status(404).json({ success: false, error: "Location not found" });
        }

        return res.status(200).json({ success: true, location: deletedLocation });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in deleting location" });
    }
};

export { addLocation, getLocations, updateLocation, deleteLocation };
