# Sample SharePoint Embedded App

The sample app in this folder is provided as a starting point for the workshop.

The motivation behind this app is to serve as a time-saver so students can focus on the SharePoint Embedded (SPE) specific tasks, code, and business logic rather than the details of creating the app's user experience (UX).

The sample client-side app is built using the following:

- React v18 (using the [Create React App](https://create-react-app.dev/) utility - [learn more](./README-CRE.md))
- [Fluent UI React v9](https://react.fluentui.dev/)
- [Microsoft Graph Toolkit v4](https://learn.microsoft.com/graph/toolkit/overview)

This project includes the dependencies you'll use to implement the app. In the process of completing the workshop, you'll have some React-specific coding tasks, but they are kept to a minimum.

In addition to the client-side app, a server-side API server is also included in the project. This server, found in the [./server](./server) folder, consists of a Node.js process that uses the [restify](http://restify.com/) package to implement a REST API server.

## Running the sample app

To run the app locally to test the flow and logic of the app, install all dependencies by executing the following command in the root of the project (same folder as this README):

```console
npm install
```

Next, start the app with the following command:

```console
npm start
```

The start process will build the client-side & server-ide apps, start two local web servers, and load the client-side app's homepage in your default browser:

- Client-side app: `http://localhost:3000/`
- Server-side app: `http://localhost:3001/`
