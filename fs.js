const hashString = async(str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
const getCookie = (cookieName) => {
    var name = cookieName + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var cookieArray = decodedCookie.split(';');
    for (var i = 0; i < cookieArray.length; i++) {
        var cookie = cookieArray[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) == 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return "";
}
const setCookie = (cookieName, cookieValue, expirationDays) => {
    var d = new Date();
    d.setTime(d.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
}
const getCurrentDate = () => {
    const d = new Date()
    const formattedDate = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`       
    return formattedDate
}
const getUserIP =  () => {
    return fetch('https://api.ipify.org?format=json')
}
const sendAnalyticsData = (data) => {

    const url = 'https://bi-tools-dev.flwr.ph/api/data-collection/ph/store'

    if(navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
    } else {
        fetch(url, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                "Access-Control-Allow-Origin": "*", // Allow requests from any origin
                "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS", // Allow specified methods
                "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept", // Allow specified headers
            },
            KeepAlive :true,
            body: JSON.stringify(data),  
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }


}

document.addEventListener('DOMContentLoaded', () => {

    // SESSION TIME LIMIT START
    let countdownTime = 5 * 60; // 5 minutes in seconds
    const countdownInterval = setInterval(() => {
        // Calculate minutes and seconds
        let minutes = Math.floor(countdownTime / 60);
        let seconds = countdownTime % 60;
    
        // Format the time as mm:ss
        let formattedTime = minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    
        // Display the countdown
        // console.log(formattedTime)
    
        // Decrease the countdown time by 1 second
        countdownTime-=1;
    
        // Check if the countdown is finished
        if (countdownTime < 0) {
            clearInterval(countdownInterval);
            hashString(getCurrentDate()).then(hashedString => {
                setCookie("session_analytics_id", hashedString, 1)
            })
            console.log("session expired!")
        }
    }, 1000);
    // SESSION TIME LIMIT END
    
    const session_id = getCookie("session_analytics_id")
    const current_url_array = []
    const current_url = window.location.href 
    const split = current_url.split("/")

    split.map((item) => {
        item.length && current_url_array.push(item)
    })

    
    // GET PREFIX URL NAME NEXT TO HTTP OR HTTPS
    const urlPrefix = current_url_array[1]
    const prefixIndex = split.indexOf(urlPrefix)

    // SLICED URL BASED ON PREFIX INDEX + 1 INDEX TO GET URL ENDPOINT
    const sliced = split.slice(prefixIndex + 1)
    

    // HOME PAGE START

    if(!sliced[0]?.length || !sliced?.length) {     

    // SESSION START
        hashString(getCurrentDate()).then(hashedString => {
            !session_id && setCookie("session_analytics_id", hashedString, 1)
        })
    // SESSION END

        getUserIP().then(response => response.json())
        .then(data => {
            const payload = {
                session_id: getCookie("session_analytics_id"),
                action_key: 'entrance',
                page_entrance: 'page',
                source_id: 1,
                hub_id: getCookie("hub_id") ? getCookie("hub_id")  : 1,
                user_agent: window.navigator.userAgent,
                ip_address: data.ip
            }

            console.log("@hp:", payload)
            sendAnalyticsData(payload)

        })
        .catch(error => console.error('Error fetching IP address:', error));


        // CHANGE HUB ACTION TYPE START

        const hub = document.getElementsByName("hub_id")
        const chpayload = {}
        hub[0].addEventListener('change', (e) => {
            chpayload.session_id = getCookie("session_analytics_id"),
            chpayload.action_key = 'change hub',
            chpayload.hub_id =  e.target.value,
            console.log("@CH:", chpayload)
        })

         // CHANGE HUB ACTION TYPE END


    }
    
    // HOME PAGE END
})

