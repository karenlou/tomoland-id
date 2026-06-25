import DownloadList from '@/components/DownloadList'
import { getCitizens } from '@/lib/getCitizens'

export const dynamic = 'force-dynamic'

export default async function DownloadPage() {
  const citizens = await getCitizens()
  return <DownloadList citizens={citizens} />
}
