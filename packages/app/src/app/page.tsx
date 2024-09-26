import Image from "next/image";
import { Check, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/item";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { getAllEntries, textSearchEntries } from "@/lib/models/entry";
import prisma from "@/lib/prisma";

const PAGE_LIMIT = 5;
const DEFAULT_PAGE = 1;

export default async function Home({searchParams: {page, query}}: {searchParams: {page: string, query: string}}) {
  const count = await prisma.entry.count();
  const pageNumber = +page || DEFAULT_PAGE;
  let entries;
  if (!query) {
      entries = await getAllEntries(PAGE_LIMIT, (pageNumber - 1) * PAGE_LIMIT);
  } else {
      entries = await textSearchEntries(query, PAGE_LIMIT, (pageNumber - 1) * PAGE_LIMIT);
  }

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex text-center justify-center items-center gap-4 flex-col">
            <div className="flex gap-2 flex-col">
              <h4 className="text-3xl md:text-5xl tracking-tighter max-w-xl text-center font-extrabold mb-4">
                ZK Email SDK Registry
              </h4>
              <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-center">
                List of community submitted ZK Email patterns that can be dropped into your project.
              </p>
            </div>
            <div>
              <a href="https://t.me/zkemail" target="_blank" rel="noopener noreferrer">
                <Button className="gap-2 mr-4" variant="outline">
                  Any questions? Reach out <Mail className="w-4 h-4" />
                </Button>
              </a>
              <a href="/submit" className="gap-2"><Button>Submit a new pattern</Button></a>
            </div>
          </div>

          <div className="max-w-3xl w-full mx-auto">
            {entries.map(entry => {
              return (<>
                <Item key={entry.id} entry={entry} />
                <hr className="mt-6 mb-6 w-3/4 ml-auto mr-auto" />
              </>)
            })}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              { Array.from({ length: (count / PAGE_LIMIT) + 1 }, (x, i) => {
                return (
                  <PaginationItem key={i}>
                    <PaginationLink href={"?page="+(i+1)}>{i + 1}</PaginationLink>
                  </PaginationItem>
                )
              })}
              {/* <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem> */}
              <PaginationItem>
                <PaginationNext
                  href={
                    pageNumber < Math.ceil(count / PAGE_LIMIT)
                      ? `?page=${pageNumber + 1}${
                          query ? `&query=${query}` : ""
                        }`
                      : "#"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
    );
}
