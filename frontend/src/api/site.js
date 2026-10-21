// Shop texts the super admin can change: announcement strip, hero, perks, footer links
import client from './client'

export const getSite = async () => (await client.get('/site/')).data
export const getSiteForEdit = async () => (await client.get('/manage/site/')).data
export const saveSite = async data => (await client.put('/manage/site/', data)).data
