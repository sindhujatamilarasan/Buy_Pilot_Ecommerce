// Super admin: change the shop's announcement strip, hero, perks and footer links (no code change needed)
import { getSiteForEdit } from '../../api/site'
import PageHeader from '../../components/admin/PageHeader'
import SiteContentForm from '../../components/admin/SiteContentForm'
import LoadError from '../../components/LoadError'
import Spinner from '../../components/Spinner'
import { useApi } from '../../hooks/useApi'

const SiteContent = () => {
  const { data, loading, error } = useApi(getSiteForEdit)

  return (
    <div className="space-y-6">
      <PageHeader title="Site content" subtitle="What every shopper sees: top strip, home page banner, perks and footer links" />
      {loading ? <Spinner /> : error ? <LoadError what="site content" /> : <SiteContentForm initial={data} />}
    </div>
  )
}

export default SiteContent
