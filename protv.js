const {default: axios} = require("axios");
const cheerio = require("cheerio");
var fs = require("fs");

const channels = {
    "pro-tv": 1,
    "pro-2": 2,
    "pro-x": 3,
    "pro-gold": 4,
    "pro-cinema": 5
};
var consoleL = false;
async function login() {
    return new Promise(async (resolve, reject) => {
        try {
            if(consoleL) console.log("pro| login: getting auth.json");
            let auth = JSON.parse(fs.readFileSync("./auth.json").toString());
            if(consoleL) console.log("pro| login: auth.json valid");
            if(consoleL) console.log("pro| login: now signing in");
            let step1 = await axios.post("https://protvplus.ro/", `------WebKitFormBoundaryqDXFH3zcgh9GNa3N\r\nContent-Disposition: form-data; name="email"\r\n\r\n${
                auth.pro.username
            }\r\n------WebKitFormBoundaryqDXFH3zcgh9GNa3N\r\nContent-Disposition: form-data; name="password"\r\n\r\n${
                auth.pro.password
            }\r\n------WebKitFormBoundaryqDXFH3zcgh9GNa3N\r\nContent-Disposition: form-data; name="_do"\r\n\r\nheader-header_login-loginForm-form-submit\r\n------WebKitFormBoundaryqDXFH3zcgh9GNa3N\r\nContent-Disposition: form-data; name="login"\r\n\r\nIntră în cont\r\n------WebKitFormBoundaryqDXFH3zcgh9GNa3N--\r\n`, {
                headers: {
                    accept: "*/*",
                    "accept-language": "en-GB,en;q=0.9",
                    "cache-control": "no-cache",
                    "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryqDXFH3zcgh9GNa3N",
                    pragma: "no-cache",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "x-requested-with": "XMLHttpRequest"
                },
                referrer: "https://protvplus.ro/",
                referrerPolicy: "strict-origin-when-cross-origin",
                mode: "cors"
            });
            if(consoleL && step1 && step1.data) console.log("pro| login: received response");
            if (step1.headers["set-cookie"]) {
                if(consoleL) console.log("pro| login: got cookies");
                if(consoleL) console.log(`pro| login: cookies_received = ${step1.headers["set-cookie"]}`);
                if(consoleL) console.log(`pro| login: getting Bearer token`);
                let step2 = await axios.get("https://protvplus.ro/api/v1/user/check", {
                    headers: {
                        accept: "application/json, text/javascript, */*; q=0.01",
                        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                        "cache-control": "no-cache",
                        pragma: "no-cache",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "sec-gpc": "1",
                        "x-requested-with": "XMLHttpRequest",
                        cookie: step1.headers["set-cookie"][0].match(/[^;]*/)[0] + ";"
                    },
                    referrer: "https://protvplus.ro/",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    mode: "cors"
                });
                if(consoleL && step2 && step2.data) console.log(`pro| login: got response`);
                if(consoleL) console.log(step2.data);
                if (step2.data && step2.data.data && step2.data.data.bearer) {
                    if(consoleL) console.log(`pro| login: got Bearer token`);
                    if(consoleL) console.log(`pro| login: ${step2.data.data.bearer}`);
                    auth.pro.cookies = step2.headers["set-cookie"][0].match(/[^;]*/)[0];
                    auth.pro.bearer = step2.data.data.bearer;
                    fs.writeFileSync("./auth.json", JSON.stringify(auth));
                    resolve({cookie: auth.pro.cookies, bearer: auth.pro.bearer});
                }else reject("pro| login: No Bearer (Username or Password incorrect)")
            } else reject("pro| login: Something wen wrong while signing in");

        } catch (error) {
            reject("pro| login: " + error);
            if(consoleL) console.error("pro| " + error);
        }
    });
}
async function getLogin() {
    return new Promise(async (resolve, reject) => {
        try {
            if(consoleL) console.log(`pro| getLogin: getting auth.json`);
            let auth = JSON.parse(fs.readFileSync("./auth.json").toString()).pro;
            if(consoleL && auth) console.log(`pro| getLogin: auth.json valid`);
            if(!auth || !auth.username || !auth.password || auth.username === "" || auth.password === "") throw "pro: No Credentials"
            if (auth.cookies && auth.bearer) {
                if(consoleL) console.log(`pro| getLogin: using existing tokens`);
                resolve({cookie: auth.cookies, bearer: auth.bearer});
            } else if (!auth.cookies || !auth.bearer) {
                if(consoleL) console.log(`pro| getLogin: trying getLogin`);
                let token = await login();
                if(consoleL && token) console.log(`pro| getLogin: got tokens`);
                resolve({cookie: token.cookie, bearer: token.bearer});
            }
        } catch (error) {
            reject("pro| getLogin: " + error);
            if(consoleL) console.error(error);
        }
    });
}
async function getPlaylist(name) {
    return new Promise(async (resolve, reject) => {
        try {
            if(consoleL) console.log(`pro| getPlaylist: getting tokens`);
            let auth = await getLogin();
            if(consoleL && auth) console.log(`pro| getPlaylist: got tokens`);
            if(consoleL) console.log(`pro| getPlaylist: getting channel's HTML`);
            let step1 = await axios.get(`https://protvplus.ro/tv-live/${
                channels[name]
            }-${name}`, {
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "sec-gpc": "1",
                    "upgrade-insecure-requests": "1",
                    cookie: auth.cookie + ";"
                },
                referrerPolicy: "strict-origin-when-cross-origin",
                mode: "cors"
            });
            if(consoleL && step1.data) console.log(`pro| getPlaylist: got first link`);
            let $ = cheerio.load(step1.data);
            if(consoleL && $) console.log(`pro| getPlaylist: ${$(".live-iframe-wrapper.js-user-box")[0].attribs["data-url"]}`);
            if(consoleL) console.log(`pro| getPlaylist: getting channel's second link`);
            let step2 = await axios.get($(".live-iframe-wrapper.js-user-box")[0].attribs["data-url"], {
                headers: {
                    accept: "*/*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    authorization: `Bearer ${
                        auth.bearer
                    }`,
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "x-requested-with": "XMLHttpRequest",
                    cookie: auth.cookie + ";"
                },
                referrer: `https://protvplus.ro/tv-live/${
                    channels[name]
                }-${name}`,
                referrerPolicy: "strict-origin-when-cross-origin",
                mode: "cors"
            });
            if(consoleL && step1.data) console.log(`pro| getPlaylist: got channel's second link`);
            $ = cheerio.load(step2.data);
            if(consoleL && $) console.log(`pro| getPlaylist: ${$("iframe").attr("src")}`);
            if(consoleL) console.log(`pro| getPlaylist: getting channel's stream URL`);
            let step3 = await axios.get($("iframe").attr("src"), {
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    "sec-fetch-dest": "iframe",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-site",
                    "sec-gpc": "1",
                    "upgrade-insecure-requests": "1",
                    cookie: auth.cookie + ";"
                },
                referrer: "https://protvplus.ro/",
                referrerPolicy: "strict-origin-when-cross-origin",
                mode: "cors"
            });
            if(consoleL && step3.data) console.log(`pro| getPlaylist: got channel's stream`);
            if(consoleL && step3.data) console.log(`pro| getPlaylist: ${JSON.parse(step3.data.match('{"HLS"(.*)}]}')[0]).HLS[0].src}`);
            resolve(JSON.parse(step3.data.match('{"HLS"(.*)}]}')[0]).HLS[0].src);
        } catch (error) {
            reject("pro| getPlaylist: " + error);
            console.error(error);
        }
    });
}

// function m3uFixURL(m3u, url){
//     m3u = m3u.split('\n');
//     m3u.forEach((el, index, array) => {
//         if(el.match('URI=\"(.*)\"') != null){
//             array[index] = el.replace(el.match('\"(.*).key\"')[0], '\"' + url + el.match('URI=\"(.*)\"')[1] + "\"")
//         }
//          if(el.match('(.*).ts') != null){
//             array[index] = url + el;
//         }
//     })
//     return m3u.join('\n');
// }
function selectQuality(data) {
    if(consoleL) console.log(`pro| selectQuality: ${data.match("(.*)fullhd.m3u8(.*)")[0] ? data.match("(.*)fullhd.m3u8(.*)")[0] : data.match("(.*)hd.m3u8(.*)")[0]}`);
    return data.match("(.*)fullhd.m3u8(.*)")[0] ? data.match("(.*)fullhd.m3u8(.*)")[0] : data.match("(.*)hd.m3u8(.*)")[0];
}
exports.pro = async (req, res, next) => {
    try {
        if (channels[req.params.channel]) {
            if(consoleL) console.log(`pro| pro: Getting channel stream URL`);
            let quality = await axios.get(await getPlaylist(req.params.channel), {
                headers: {
                    accept: "*/*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                    "sec-gpc": "1"
                },
                referrer: "https://media.cms.protvplus.ro/",
                referrerPolicy: "strict-origin-when-cross-origin",
                mode: "cors"
            });
            if(consoleL && quality.data) console.log(`pro| pro: got channel's stream URL`);
            if(consoleL && quality.data) console.log(`pro| pro: ${quality.config.url.match("(.*)/playlist.m3u8")[1] + "/" + selectQuality(quality.data)}`);
            res.redirect(quality.config.url.match("(.*)/playlist.m3u8")[1] + "/" + selectQuality(quality.data));
        } else
            next();
    } catch (error) {
        res.status(500).send(error);
    }
};
