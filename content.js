// Function to render the schedule table
console.log("Script is loaded!");
const authButton = document.getElementById('auth-button');
function renderScheduleTable(calendars, eventsByCalendar) {
  const table = document.getElementById('schedule-table');

  // Clear any existing content in the table
  table.innerHTML = '';

  // Create table header
  const headerRow = document.createElement('tr');
  const firstHeader = document.createElement('th');
  firstHeader.textContent = 'Date';
  headerRow.appendChild(firstHeader);

  calendars.forEach((calendar) => {
    const th = document.createElement('th');
    th.textContent = calendar.summary; // Calendar name
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Create table body
  const today = new Date();
  const daysToShow = 14; // Number of days to display in the schedule

  for (let i = 0; i < daysToShow; i++) {
    const row = document.createElement('tr');
    const dateCell = document.createElement('td');

    // Format date
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    dateCell.textContent = currentDate.toDateString();
    row.appendChild(dateCell);

    calendars.forEach((calendar) => {
      const cell = document.createElement('td');
      const events = eventsByCalendar[calendar.id] || [];

      // Filter events for the current date
      const eventsForDate = events.filter((event) => {
        const eventDate = new Date(event.start.date || event.start.dateTime);
        return (
          eventDate.toDateString() === currentDate.toDateString()
        );
      });

      // Add event summaries to the cell
      eventsForDate.forEach((event) => {
        const eventDiv = document.createElement('div');
        eventDiv.textContent = event.summary || 'No Title';
        cell.appendChild(eventDiv);
      });

      row.appendChild(cell);
    });

    table.appendChild(row);
  }
}

// Function to fetch and display calendar data
function displayCalendarData() {
  chrome.storage.local.get('accessToken', ({ accessToken }) => {
    if (!accessToken) {
      console.error('No access token found. Please authenticate first.');
      return;
    }

    // Fetch list of calendars
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((calendarData) => {
        const calendars = calendarData.items || [];
        const eventsByCalendar = {};

        // Fetch events for each calendar
        const eventFetches = calendars.map((calendar) => {
          return fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
            .then((response) => response.json())
            .then((eventData) => {
              eventsByCalendar[calendar.id] = eventData.items || [];
            });
        });

        // Once all events are fetched, render the table
        Promise.all(eventFetches)
          .then(() => {
            renderScheduleTable(calendars, eventsByCalendar);
          })
          .catch((error) => {
            console.error('Error fetching calendar events:', error);
          });
      })
      .catch((error) => {
        console.error('Error fetching calendar list:', error);
      });
  });
}

// Event listener for the "Authorize" button
document.getElementById('auth-button').addEventListener('click', () => {
  authButton.disabled = true;
  const redirectUri = chrome.identity.getRedirectURL();

  // Launch the OAuth flow
  chrome.identity.launchWebAuthFlow(
    {
      url: `https://accounts.google.com/o/oauth2/auth?client_id=757982592174-ig9tcksp8v5a4kithlgb75o2cui5ahk8.apps.googleusercontent.com&response_type=token&redirect_uri=${redirectUri}&scope=https://www.googleapis.com/auth/calendar`,
      interactive: true,
    },
    (redirectUrl) => {
      if (redirectUrl) {
        // Extract the access token from the redirect URL
        const params = new URLSearchParams(new URL(redirectUrl).hash.replace('#', '?'));
        const accessToken = params.get('access_token');

        if (accessToken) {
          chrome.storage.local.set({ accessToken }, () => {
            console.log('Access token saved successfully.');
          });
          displayCalendarData();
        }
      }
    }
  );
});
