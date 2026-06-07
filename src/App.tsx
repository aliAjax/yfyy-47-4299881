import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import TicketList from "@/pages/TicketList";
import TicketDetail from "@/pages/TicketDetail";
import NewTicket from "@/pages/NewTicket";
import Supervision from "@/pages/Supervision";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TicketList />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/supervision" element={<Supervision />} />
        </Route>
      </Routes>
    </Router>
  );
}
