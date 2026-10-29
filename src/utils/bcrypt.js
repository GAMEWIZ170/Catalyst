const bcrypt = require("bcrypt");

const hashPassword = async (password) => {
    try {
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);
    return hashed;
    } catch (err) {
        console.log(err.message)
    }
   
}

module.exports = hashPassword;