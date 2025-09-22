import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import { App } from "@/app";

// biome-ignore lint/style/noNonNullAssertion: root will always be found
const root = createRoot(document.getElementById("root")!);
root.render(
	<React.StrictMode>
		<Provider>
			<App />
			<Toaster />
		</Provider>
	</React.StrictMode>,
);
