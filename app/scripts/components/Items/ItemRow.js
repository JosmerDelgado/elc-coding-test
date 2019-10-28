import React from 'react'

const ItemRow = ({item}) => {
    return (
        <div className="item-row">
            <img className="item-picture" src={item.picture} />
            <p className="item-name">{item.name}</p>
            <p className="item-about">{item.about}</p>
        </div>
    )
}
export default ItemRow