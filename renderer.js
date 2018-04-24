// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require('fs');
const xml2js = require('xml2js');
const forEach = require('lodash/forEach');
const find = require('lodash/find');
const isEmpty = require('lodash/isEmpty');
const request = require('request');
const { shell } = require('electron');
const untapped = require('node-untappd');
const untappedClient = new untapped(false);
untappedClient.setClientId('ABBD288D0A3CBD5EFEBE3A283C9095907899D919');
untappedClient.setClientSecret('E1C724E8197B576CA5E7C511AC87D995249EBB84');
const moment = require('moment');

const rowBuilder = require('./row');

const parser = new xml2js.Parser();

// artiklar -> artikel -> [0-9999] -> [0-99] -> 15 -> Öl
const beers = [];
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchFormContainer = document.getElementById('search-form');
const articleContainer = document.getElementById('article');
const goBackBtn = document.getElementById('go-back');

fs.readFile(__dirname + '/systemet.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
        if (result) {
            forEach(result.artiklar.artikel, (item, key) => {
                if (item.Varugrupp[0] === 'Öl') {
                    beers.push(item);
                }
            });
        }
        searchInput.focus();
    });
});

const clearResults = () => {
    while (searchResults.firstChild) {
        searchResults.removeChild(searchResults.firstChild);
    }
};

const newElement = (type) => {
    return document.createElement(type);
}

const showArticle = (e, articleId, uri) => {
    e.preventDefault();
    const header = document.getElementById('article-header');
    const desc = document.getElementById('article-desc');
    const image = document.getElementById('article-image');
    const producer = document.getElementById('article-producer');
    const price = document.getElementById('article-price');
    const untapped = document.getElementById('beer-on-untapped');

    const r = new RegExp(`static\.systembolaget\.se\/imagelibrary\/publishedmedia\/.*\/${articleId}.jpg`);
    const descPattern = /<p class="description[\s]?">(.*)<\/p>/;

    let description = '';
    image.src = './images/beericon.png';

    request(`https://www.systembolaget.se/dryck/ol/${uri}`, (err, response, body) => {

        const match = r.exec(body);
        const descMatch = descPattern.exec(body);

        if (match) {
            image.src = 'https://' + match[0];
        }
        if (descMatch) {
            description += descMatch[0];
        }

        // Load this beer
        const beer = find(beers, (beer) => beer.Artikelid[0] === articleId);

        // Set the header
        header.innerHTML = `${beer.Namn[0]} ${beer.Namn2[0]}`;

        // producer
        producer.innerHTML = beer.Producent[0];

        // Price
        price.innerHTML = beer.Prisinklmoms[0] + ' kr';

        description += `
            <strong>Typ:</strong> ${beer.Typ[0]}<br />
            <strong>Ursprung:</strong> ${beer.Ursprung[0]}, ${beer.Ursprunglandnamn[0]}<br />
            <strong>Förpackning:</strong> ${beer.Forpackning[0]}
            `;

        // Add the link to Systembolaget
        description += `<br />Källa: `;

        // Set the description
        desc.innerHTML = description;

        const sourceLink = document.createElement('a');
        const linkText = document.createTextNode('Systembolaget');

        sourceLink.href = `https://www.systembolaget.se/dryck/ol/${uri}`;
        sourceLink.appendChild(linkText);
        sourceLink.onclick = (e) => {
            e.preventDefault();
            shell.openExternal(`https://www.systembolaget.se/dryck/ol/${uri}`);
        }

        desc.appendChild(sourceLink);

        // Clear untapped feed
        while (untapped.firstChild) {
            untapped.removeChild(untapped.firstChild);
        }

        const loading = newElement('span');
        loading.innerHTML = 'Laddar feed...';
        untapped.appendChild(loading);

        untappedClient.beerSearch((err, obj) => {
            if (obj.meta.code === 200) {
                if (obj.response.beers.count > 0) {
                    const beer = obj.response.beers.items[0].beer;
                    const checkins = obj.response.beers.items[0].checkin_count;

                    const uLink = document.createElement('a');
                    const ulinkText = document.createTextNode('Untapped');
                    const uHref = `https://untappd.com/b/${beer.beer_slug}/${beer.bid}`;

                    uLink.href = uHref;
                    uLink.appendChild(ulinkText);
                    uLink.onclick = (e) => {
                        e.preventDefault();
                        shell.openExternal(uHref);
                    }

                    untapped.removeChild(loading);

                    const nbrCheckins = newElement('span');
                    nbrCheckins.classList.add('subheader');
                    nbrCheckins.innerHTML = `Antal checkins ${checkins}`;
                    untapped.appendChild(nbrCheckins);

                    untappedClient.beerActivityFeed((err, feed) => {
                        if (feed.meta.code === 200) {
                            if (feed.response.checkins.count > 0) {
                                forEach(feed.response.checkins.items, checkin => {
                                    const checkinContainer = document.createElement('div');
                                    checkinContainer.classList.add('row', 'checkin-row');

                                    const rating = document.createElement('div');
                                    rating.classList.add('col-xs-2', 'untapped-rating');
                                    rating.innerHTML = `${checkin.rating_score}/5`;

                                    const check = document.createElement('div');
                                    check.classList.add('col-xs-10', 'untapped-check');
                                    let checkinDesc = `
                                        <div class='checkin-time'>${moment(checkin.created_at).fromNow()}</div>
                                        <p>${checkin.user.first_name} (${checkin.user.user_name})</p>
                                        `;
                                    if (checkin.checkin_comment) {
                                        checkinDesc += `<blockquote class='checkin-comment'>”${checkin.checkin_comment}”</blockquote>`;
                                    }
                                    if (checkin.media.count > 0) {
                                        checkinDesc += `<img class='checkin-image' src='${checkin.media.items[0].photo.photo_img_sm}'>`;
                                    }
                                    if (!isEmpty(checkin.venue)) {
                                        checkinDesc += '<p>';
                                        checkinDesc += checkin.venue.venue_name

                                        if (checkin.venue.location) {
                                            checkinDesc += `<br />${checkin.venue.location.venue_city} ${checkin.venue.location.venue_country}`;
                                        }
                                        checkinDesc += '</p>';
                                    }
                                    check.innerHTML = checkinDesc;

                                    checkinContainer.appendChild(rating);
                                    checkinContainer.appendChild(check);

                                    untapped.appendChild(checkinContainer);
                                });
                            }
                        }
                    }, {
                        BID: beer.bid,
                    });

                } else {
                    loading.innerHTML = `Kunde inte hitta nått flöde på ${beer.Namn[0]} :(`;
                }
            }
        }, {
            q: beer.Namn[0],
        })

        // show and hide containers
        searchFormContainer.style.display = 'none';
        articleContainer.style.display = 'block';
    });
};

const searchXML = (searchString) => {

    clearResults();

    const matches = beers.filter(beer => {
        return beer.Namn[0]
            .toLowerCase()
            .includes(
                searchString.toLowerCase()
            ) || beer.Typ[0]
            .toLowerCase()
            .includes(
                searchString.toLowerCase()
            );
    });
    matches.map(match => {

        const name = `${match.Namn[0]} ${match.Namn2[0]}`;
        const price = `${match.Prisinklmoms[0]} kr (${match.Forpackning[0]})`;

        const uri = match.Namn[0]
            .toLowerCase()
            .replace(/\s/g, '-')
            .replace(/ö/g, 'o')
            .replace(/ß/g, '')
            .replace(/ä|å/g, 'a') + '-' + match.nr[0];

        const row = rowBuilder.build(
            name,
            match.Typ[0],
            match.Alkoholhalt[0],
            price,
            (e) => showArticle(e, match.Artikelid[0], uri)
        );
        searchResults.appendChild(row);
    });

    searchResults.style.display = 'block';
};

searchInput.addEventListener('keyup', (e) => {
    if (e.target.value.length > 2 || e.key === 'Enter' || e.keyCode === 13) {
        searchXML(e.target.value);
    }
    if (e.target.value.length === 0) {
        clearResults();
        searchResults.style.display = 'none';
    }
});

goBackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    searchFormContainer.style.display = 'block';
    articleContainer.style.display = 'none';
});
