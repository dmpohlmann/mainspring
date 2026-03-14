import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Not Authorized</CardTitle>
          <CardDescription>
            Your GitHub account is not authorized to access this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" render={<Link href="/login" />}>
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
