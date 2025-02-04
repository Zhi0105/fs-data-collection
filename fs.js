
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
const setDeviceID = (str) => {
    const url = `https://bi-tools-dev.flwr.ph/api/data-collection/ph/hash?data=${str}`
    fetch(url).then(res => {
        if(res) {
            res.json().then(data => {
                data && setCookie("fs_device_id", data, 5 * 365)
                // data && console.log("@DI:", data)
            })
        }
    }).catch(err => {
        console.log(err)
    })
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

// FORWARD/BACKWARD BUTTON START
let currentState = 0;
let states = [0];

history.replaceState({ state: currentState }, '');

const navigate = () => {
    currentState++;
    states.push(currentState);
    history.pushState({ state: currentState }, '');
}

window.addEventListener('popstate', (evnt) => {
    if (evnt.state) {
        const newState = evnt.state.state;
        if (newState < currentState) {
            console.log('Back button was clicked');
        } else if (newState > currentState) {
            console.log('Forward button was clicked');
        }
        currentState = newState;
    }
});

navigate(); navigate();

// FORWARD/BACKWARD BUTTON END

window.addEventListener('load', () => {

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
    const device_id = getCookie("fs_device_id")
    const current_url_array = []
    const current_uri = window.location.href 
    const split = current_uri.split("/")


    split.map((item) => {
        item.length && current_url_array.push(item)
    })

    // GET PREFIX URL NAME NEXT TO HTTP OR HTTPS
    const urlPrefix = current_url_array[1]
    const prefixIndex = split.indexOf(urlPrefix)

    // SLICED URL BASED ON PREFIX INDEX + 1 INDEX TO GET URL ENDPOINT
    const sliced = split.slice(prefixIndex + 1)

    //  RELOAD BUTTON START
    if (performance.getEntriesByType("navigation").length > 0) {
        // Get the PerformanceNavigationTiming object
        const [navigationTiming] = performance.getEntriesByType("navigation");
        // Extract and log various timing properties
            navigationTiming.type.toLowerCase() === 'reload' && console.log("refreshed listened!")
        
    } else {
    console.log("Navigation Timing API not supported by this browser.");
    }
    //  RELOAD BUTTON END


    // HOME PAGE START
    if(!sliced[0]?.length || !sliced?.length) {     

    // SESSION START
        !device_id && setDeviceID(getCurrentDate())
        hashString(getCurrentDate()).then(hashedString => {
            !session_id && setCookie("session_analytics_id", hashedString, 1)
        })
    // SESSION END

        getUserIP().then(response => response.json())
        .then(data => {
            const payload = {
                session_id: getCookie("session_analytics_id"),
                device_id: getCookie("fs_device_id"),
                action_key: 'entrance',
                page_entrance: 'page',
                source_id: current_uri.toLowerCase() === 'https://potico.ph/' ? 5 : 1,
                hub_id: getCookie("hub_id") ? getCookie("hub_id")  : 1,
                user_agent: window.navigator.userAgent,
                ip_address: data.ip,
                referrer: document.referrer,
                url: window.location.href
            }

            console.log("@hp:", payload)
            sendAnalyticsData(payload)

        })
        .catch(error => console.error('Error fetching IP address:', error));

        // CHANGE HUB ACTION TYPE START
        
        const chpayload = {}
        const selectElement = document.querySelector('select[name="hub_id"]');
        if (selectElement) {
            selectElement.addEventListener('change',(select) => {
                chpayload.session_id = getCookie("session_analytics_id")
                chpayload.device_id = getCookie("fs_device_id")
                chpayload.action_key = 'change_hub'
                chpayload.hub_id =  select.target.value
                chpayload.referrer = document.referrer
                chpayload.url = window.location.href
                console.log("@CH:", chpayload)
                sendAnalyticsData(chpayload)
            });
        }

        document.addEventListener('click', (location) => {
            const locationOption = location.target.closest('.modal-body .grid div div p');
            if (locationOption) {
                setTimeout(() => {
                    chpayload.session_id = getCookie("session_analytics_id")
                    chpayload.device_id = getCookie("fs_device_id")
                    chpayload.action_key = 'change_hub'
                    chpayload.hub_id =  getCookie("hub_id") 
                    chpayload.city_id = getCookie("city_id") 
                    chpayload.referrer = document.referrer
                    chpayload.url = window.location.href
                    console.log("@CH:", chpayload)
                    sendAnalyticsData(chpayload)
                }, 1000);
            }
        })

         // CHANGE HUB ACTION TYPE END

        // LOGIN & REGISTRATION CLICK EVENTS START
        document.addEventListener("click", (event) => {
            const anchor = event.target.closest('a');
            if (anchor) {
                const split = anchor.href.split('/')
                if(String(split[split.length - 1]).toLocaleLowerCase() === 'login') { 
                    const payload = {
                        session_id: getCookie("session_analytics_id"),
                        device_id: getCookie("fs_device_id"),
                        action_key: 'click_login',
                        pixel_back_timestamp: getCurrentDate(),
                        referrer: document.referrer,
                        url: window.location.href
                    }
                    console.log("@login:", payload)
                    sendAnalyticsData(payload)
                }
                if(String(split[split.length - 1]).toLocaleLowerCase() === 'register') { 
                    const payload = {
                        session_id: getCookie("session_analytics_id"),
                        device_id: getCookie("fs_device_id"),
                        action_key: 'click_registration',
                        pixel_back_timestamp: getCurrentDate(),
                        referrer: document.referrer,
                        url: window.location.href
                    }
                    console.log("@register:", payload)
                    sendAnalyticsData(payload)
                }                
            } })
        // LOGIN & REGISTRATION CLICK EVENTS END

        // CHANGE LANGUAGE TRACK START
        // document.addEventListener('click', (list) => {
        //     const a = list.target.closest('li[id="multiselect-option-en"]')
        //     if(a) {
        //         setTimeout(() => {
        //         console.log("clicked")  
        //         }, 2000);
        //     }
        // })
        // CHANGE LANGUAGE TRACK END

    }
    // HOME PAGE END
    // PDP START

    document.addEventListener('click', (product_card) => {
        const price = product_card.target.closest('article')?.children[2].children[1].firstChild.firstChild.textContent
        price && console.log('@click_product:', price)
        if(price) {
            const payload = {
                session_id: getCookie("session_analytics_id"),
                device_id: getCookie("fs_device_id"),
                action_key: 'click_product',
                price: price,
                pixel_back_timestamp: getCurrentDate(),
                referrer: document.referrer,
                url: window.location.href
            }
            console.log("@ProductClick:", payload)
            sendAnalyticsData(payload)
        }
        
        // if(product_click) {
        //     console.log("product card was clicked!")
        // }
    })

    if(sliced[0]?.length  && sliced[0]?.toLowerCase() === 'product'){
        setTimeout(() => {
            const price = document.querySelector('div[class="justify-self-end text-brand"] span').textContent
            price && console.log('@click_product:', price)
            const divElement = document.querySelector('#app')
             if(price && divElement){
                const data = JSON.parse(divElement.getAttribute('data-page'))
                const payload = {
                    session_id: getCookie("session_analytics_id"),
                    device_id: getCookie("fs_device_id"),
                    action_key: 'product_load',
                    price: price,
                    product_id: data?.props.product.id,
                    pixel_back_timestamp: getCurrentDate(),
                    referrer: document.referrer,
                    url: window.location.href
                }
                console.log("@ProductLoad:", payload)
                sendAnalyticsData(payload)
            }
        }, 1000);
    }
  

    // PDP END
    // MY ACCOUNT START
    if(sliced[0]?.length  && sliced[0]?.toLowerCase() === 'my-account'){
        setTimeout(() => {
                const payload = {
                    session_id: getCookie("session_analytics_id"),
                    device_id: getCookie("fs_device_id"),
                    action_key: 'click_my_account',
                    pixel_back_timestamp: getCurrentDate(),
                    referrer: document.referrer,
                    url: window.location.href
                }
                console.log("@MA:", payload)
                sendAnalyticsData(payload)
        }, 1000);
    }    
    document.addEventListener('click', (ma) => {
        const my_account = ma.target.textContent
        if(my_account.toLocaleLowerCase() === 'my account') {
            setTimeout(() => {
                const payload = {
                    session_id: getCookie("session_analytics_id"),
                    device_id: getCookie("fs_device_id"),
                    action_key: 'click_my_account',
                    pixel_back_timestamp: getCurrentDate(),
                    referrer: document.referrer,
                    url: window.location.href
                }
                console.log("@MA:", payload)
                sendAnalyticsData(payload)
            }, 1000);
        }
        
    })
    // MY ACCOUNT END
    // TRACK ORDER START
    document.addEventListener('click', (trackevent) => {
        const trackorder = trackevent.target.closest('div[class="text-right"] button')
        if(trackorder) {
            const order = document.querySelector('input[name="order_name"]').value.split('-')
            const email = document.querySelector('input[name="contact_email"]').value
            if(order && email) {
                const payload = {
                    session_id: getCookie("session_analytics_id"),
                    device_id: getCookie("fs_device_id"),
                    action_key: 'track_order',
                    order_number: Number(order[order.length - 1]),
                    email: email,
                    referrer: document.referrer,
                    url: window.location.href
                }
                console.log("@TO:", payload)
                sendAnalyticsData(payload)
            }
        }
    })
    // TRACK ORDER END
    // CATEGORY START
    document.addEventListener('click', (category) => {
        const subcat = category.target.closest('div[class="nav-container"] div a')
        if(subcat) {
            setTimeout(() => {
                const payload = {
                    session_id: getCookie("session_analytics_id"),
                    device_id: getCookie("fs_device_id"),
                    action_key: 'click_category',
                    pixel_back_timestamp: getCurrentDate(),
                    referrer: document.referrer,
                    url: window.location.href
                }
                    console.log("@Category:", payload)
                    sendAnalyticsData(payload)
            }, 1500);
        }
    })
    // CATEGORY END

    // COLLECTION START
    if(sliced[0]?.length  && sliced[0]?.toLowerCase() === 'collection'){
        setTimeout(() => {
                const divElement = document.querySelector('#app')
                if(divElement){
                    const data = JSON.parse(divElement.getAttribute('data-page'))
                    const payload = {
                        session_id: getCookie("session_analytics_id"),
                        device_id: getCookie("fs_device_id"),
                        action_key: 'click_collection',
                        collection_id: data?.props.collection_id,
                        pixel_back_timestamp: getCurrentDate(),
                        referrer: document.referrer,
                        url: window.location.href
                    }
                    console.log("@Collection:", payload)
                    sendAnalyticsData(payload)
                }
        }, 1000);
    } 
    // COLLECTION END

    // PAGE EVENT START
    if(sliced[0]?.length  && sliced[0]?.toLowerCase() === 'page'){
        setTimeout(() => {
            const payload = {
                session_id: getCookie("session_analytics_id"),
                device_id: getCookie("fs_device_id"),
                action_key: 'click_page',
                pixel_back_timestamp: getCurrentDate(),
                referrer: document.referrer,
                url: window.location.href
            }
            console.log("@page:", payload)
            sendAnalyticsData(payload)
        }, 1000);
    }
    // PAGE EVENT END
    
    // BILLING START
    if(sliced?.length && sliced[sliced?.length - 1]?.toLowerCase() === 'information'){
        setTimeout(() => {
            const payload = {
                session_id: getCookie("session_analytics_id"),
                device_id: getCookie("fs_device_id"),
                action_key: 'click_shipping',
                pixel_back_timestamp: getCurrentDate(),
                referrer: document.referrer,
                url: window.location.href
            }
            console.log("@Shipping:", payload)
            sendAnalyticsData(payload)
        }, 1000);
    }
    // BILLING END
    // PAYMENT START
    document.addEventListener('click', (payment) => {
        const paymethod = payment.target.closest('div[class="text-center lg:flex lg:justify-between mt-6"] button')
        if(paymethod) {
            setTimeout(() => {
            const url = window.location.href.split("/")
                if(url[url.length - 1].toLowerCase() === 'payment') {
                    const payload = {
                        session_id: getCookie("session_analytics_id"),
                        device_id: getCookie("fs_device_id"),
                        action_key: 'click_payment',
                        pixel_back_timestamp: getCurrentDate(),
                        referrer: document.referrer,
                        url: window.location.href
                    }
                    console.log("@Payment:", payload)
                    sendAnalyticsData(payload)
                }
            }, 1500);
        }
    })
    // PAYMENNT END
})
