// const { cartItems, addItem, count } = useCart()
import { useContext } from 'react'
import { CartContext } from '../context/CartContext'

export const useCart = () => useContext(CartContext)
