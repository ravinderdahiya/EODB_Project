const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function AdminRecentEventsTable({ events }) {
  return (
    <article className="admin-card admin-table-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Operations</span>
          <h3>Recent Events</h3>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Category</th>
              <th scope="col">Date</th>
              <th scope="col">Venue</th>
              <th scope="col">Bookings</th>
              <th scope="col">Revenue</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const statusClass = event.status.toLowerCase().replace(/\s+/g, "-");

              return (
                <tr key={event.id}>
                  <td>
                    <strong>{event.name}</strong>
                    <small>{event.id}</small>
                  </td>
                  <td>{event.category}</td>
                  <td>{event.date}</td>
                  <td>{event.venue}</td>
                  <td>{event.bookings.toLocaleString("en-IN")}</td>
                  <td>{currencyFormatter.format(event.revenue)}</td>
                  <td>
                    <span className={`admin-status admin-status--${statusClass}`}>
                      {event.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
