import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import TicketList from "@/pages/TicketList";
import TicketDetail from "@/pages/TicketDetail";
import NewTicket from "@/pages/NewTicket";
import Supervision from "@/pages/Supervision";
import BatchImport from "@/pages/BatchImport";
import MyTodo from "@/pages/MyTodo";
import ContactBook from "@/pages/ContactBook";
import DispatchRules from "@/pages/DispatchRules";
import HolidayConfig from "@/pages/HolidayConfig";
import SLARules from "@/pages/SLARules";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TicketList />} />
          <Route path="/my-todo" element={<MyTodo />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets/batch-import" element={<BatchImport />} />
          <Route path="/supervision" element={<Supervision />} />
          <Route path="/contacts" element={<ContactBook />} />
          <Route path="/dispatch-rules" element={<DispatchRules />} />
          <Route path="/sla-rules" element={<SLARules />} />
          <Route path="/holiday-config" element={<HolidayConfig />} />
        </Route>
      </Routes>
    </Router>
  );
}
