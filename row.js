const build = (name, type, percent, price, callback) => {

    const row = document.createElement('div');
    const firstColumn = document.createElement('div');
    const secondColumn = document.createElement('div');
    const thirdColumn = document.createElement('div');
    const forthColumn = document.createElement('div');

    row.classList.add('row', 'search-item');

    firstColumn.classList.add('col-xs-3');
    secondColumn.classList.add('col-xs-3');
    thirdColumn.classList.add('col-xs-3');
    forthColumn.classList.add('col-xs-3');

    const link = document.createElement('a');

    link.onclick = (e) => callback(e);

    link.href = '#';
    link.innerHTML = name;
    firstColumn.appendChild(link);

    secondColumn.innerHTML = type;
    thirdColumn.innerHTML = percent;
    forthColumn.innerHTML = price;

    row.appendChild(firstColumn);
    row.appendChild(secondColumn);
    row.appendChild(thirdColumn);
    row.appendChild(forthColumn);

    return row;

}

module.exports = {
    build,
}
