import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { BiTrash } from "react-icons/bi";
import EditableField from "./EditableField";

const InvoiceItem = ({
  items,
  onItemizedItemEdit,
  currency,
  onRowDel,
  onRowAdd,
  isLocked,
}) => {
  return (
    <div>
      <Table>
        <thead>
          <tr>
            <th>ITEM</th>
            <th>QTY</th>
            <th>PRICE/RATE</th>
            <th className="text-center">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onItemizedItemEdit={onItemizedItemEdit}
              onDelEvent={onRowDel}
              currency={currency}
              isLocked={isLocked}
            />
          ))}
        </tbody>
      </Table>
      <Button
        className="fw-bold btn-secondary"
        onClick={onRowAdd}
        disabled={isLocked}
      >
        Add Item
      </Button>
    </div>
  );
};

const ItemRow = ({ item, onItemizedItemEdit, onDelEvent, currency, isLocked }) => {
  const handleDelete = () => {
    onDelEvent(item);
  };

  return (
    <tr className="transition-colors duration-200 hover:bg-black/5 dark:hover:bg-slate-800/30">
      <td style={{ width: "100%" }}>
        <EditableField
          onItemizedItemEdit={onItemizedItemEdit}
          cellData={{
            type: "text",
            name: "name",
            placeholder: "Item name",
            value: item.name,
            id: item.id,
            disabled: isLocked,
          }}
        />
        <EditableField
          onItemizedItemEdit={onItemizedItemEdit}
          cellData={{
            type: "text",
            name: "description",
            placeholder: "Item description",
            value: item.description,
            id: item.id,
            disabled: isLocked,
          }}
        />
      </td>
      <td style={{ minWidth: "70px" }}>
        <EditableField
          onItemizedItemEdit={onItemizedItemEdit}
          cellData={{
            type: "number",
            name: "quantity",
            min: 1,
            step: "1",
            value: item.quantity,
            id: item.id,
            disabled: isLocked,
          }}
        />
      </td>
      <td style={{ minWidth: "130px" }}>
        <EditableField
          onItemizedItemEdit={onItemizedItemEdit}
          cellData={{
            leading: currency,
            type: "number",
            name: "price",
            min: 1,
            step: "0.01",
            presicion: 2,
            textAlign: "text-end",
            value: item.price,
            id: item.id,
            disabled: isLocked,
          }}
        />
      </td>
      <td className="text-center" style={{ minWidth: "50px" }}>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={isLocked}
          style={{ height: "33px", width: "33px", padding: "7.5px" }}
          className="mt-1"
        >
          <BiTrash />
        </Button>
      </td>
    </tr>
  );
};

export default InvoiceItem;