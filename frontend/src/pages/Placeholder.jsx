// Temporary page for features planned later in the timeline
import Message from '../components/Message'

const Placeholder = ({ icon = '🚧', title, when }) => (
  <Message icon={icon} title={title}>Coming on {when}.</Message>
)

export default Placeholder
