# Socket Event Diagram

This diagram maps out the bidirectional real-time communication between the ClinicQue backend, the Receptionist Dashboard, and the Patient Views.

\`\`\`mermaid
sequenceDiagram
    participant P as Patient View
    participant R as Receptionist View
    participant S as Node/Socket.IO Server

    Note over S: Stores In-Memory State<br/>(queue, currentPatient, history)
    
    %% Initial Connections
    P->>S: connect()
    S-->>P: emit('queue_updated', fullState)
    R->>S: connect()
    S-->>R: emit('queue_updated', fullState)

    %% Receptionist Actions
    Note over R: Receptionist adds patient
    R->>S: emit('add_patient', {name, phone})
    Note over S: Updates Queue Array
    S-->>P: emit('queue_updated', fullState)
    S-->>R: emit('queue_updated', fullState)

    Note over R: Receptionist clicks "Call Next"
    R->>S: emit('call_next', callback)
    Note over S: Calculates Time Diff (Real ETA)<br/>Shifts queue[0] to currentPatient
    S-->>R: callback({status: 'success'})
    S-->>P: emit('queue_updated', fullState)
    S-->>R: emit('queue_updated', fullState)

    Note over R: Receptionist updates baseline
    R->>S: emit('update_baseline', {newBaseline})
    Note over S: Modifies Baseline ETA Var
    S-->>P: emit('queue_updated', fullState)
    S-->>R: emit('queue_updated', fullState)

    Note over R: Receptionist marks No-Show
    R->>S: emit('skip_patient', {id})
    Note over S: Removes patient WITHOUT adding<br/>to historical ETA average
    S-->>P: emit('queue_updated', fullState)
    S-->>R: emit('queue_updated', fullState)

    %% Disconnections
    P--xS: disconnect()
    R--xS: disconnect()
\`\`\`

## Event Payload Structure

When the server emits `queue_updated`, it sends the full centralized state to all clients:

\`\`\`json
{
  "queue": [
    {
      "id": "abc123xyz",
      "tokenNumber": 4,
      "name": "Sarah Miller",
      "phone": "555-0101",
      "addedAt": 1718029312000
    }
  ],
  "currentPatient": {
    "id": "def456uvw",
    "tokenNumber": 3,
    "name": "Alex Chen",
    "phone": "555-0100",
    "addedAt": 1718029112000
  },
  "etaPerPatient": 8.5,
  "baselineETA": 10
}
\`\`\`
