const axios = require('axios');

function harperSaveMessage(message, username, room, message_type) {
    const dbUrl = process.env.HARPERDB_URL;
    const dbPw = process.env.HARPERDB_PW;
    if (!dbUrl || !dbPw) return null;

    let data = JSON.stringify({
        operation: 'insert',
        schema: 'realtime_chat_app',
        table: 'messages',
        records: [
            {
                message,
                username,
                room,
                message_type
            },
        ],
    });
    console.log(data)

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
                console.log('harperSaveMessage ::: success')
            })
            .catch(function (error) {
                reject(error);
                console.log('harperSaveMessage ::: reject')
            });
    });
}

module.exports = harperSaveMessage;