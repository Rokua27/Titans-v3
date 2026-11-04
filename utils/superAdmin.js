const superAdmins = require("../config/superadmins");

function esSuperAdmin(id) {
    return superAdmins.includes(id);
}

module.exports = {
    esSuperAdmin
};
