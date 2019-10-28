import React from 'react'
import ItemsHeader from './ItemsHeader'
import ItemsList from './ItemsList'

const ItemsResult = ({items}) => {
    return items.length ? (
        <div>
            <ItemsHeader itemsAmount={items.length}/>
            <ItemsList items={items}/>
        </div>
    ): <div>Not Found</div>
}

export default ItemsResult