let axios = require('axios');

// a function that fetches the last 100 messages sent in a particular room (notice how HarperDB also allows us to use SQL queries 👌):
function harperGetMessages(room) {
    const dbUrl = process.env.HARPERDB_URL;
    const dbPw = process.env.HARPERDB_PW;
    if (!dbUrl || !dbPw) return null;

    let data = JSON.stringify({
        operation: 'sql',
        sql: `SELECT * FROM realtime_chat_app.messages WHERE room = '${room}' LIMIT 100`,
    });

    let config = {
        method: 'post',
        url: dbUrl,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${dbPw}`,
        },
        data: data,
    };

    return new Promise((resolve, reject) => {
        axios(config)
            .then(function (response) {
                resolve(JSON.stringify(response.data));
                console.log('harperGetMessages ::: success')
            })
            .catch(function (error) {
                reject(error);
                console.log('harperGetMessages ::: reject')
            });
    });
}

module.exports = harperGetMessages;