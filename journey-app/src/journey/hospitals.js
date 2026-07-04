// Network hospital directory — demo dataset. Names and details are fictional;
// in production this is served by the provider-network service.
export const HOSPITALS = [
  { name: 'Silverline Multispeciality Hospital', city: 'Mumbai',    state: 'Maharashtra',   pincode: '400012', area: 'Parel',           beds: 480, phone: '022-4890 2200' },
  { name: 'Harbourview Hospital & Research Centre', city: 'Mumbai', state: 'Maharashtra',   pincode: '400050', area: 'Bandra West',     beds: 320, phone: '022-4455 8100' },
  { name: 'Amberwood Heart Institute',           city: 'Mumbai',    state: 'Maharashtra',   pincode: '400071', area: 'Chembur',         beds: 210, phone: '022-6712 4400' },
  { name: 'Northgate Medical Centre',            city: 'Delhi',     state: 'Delhi',         pincode: '110017', area: 'Saket',           beds: 540, phone: '011-4600 7700' },
  { name: 'Bluebell Women & Children Hospital',  city: 'Delhi',     state: 'Delhi',         pincode: '110024', area: 'Lajpat Nagar',    beds: 180, phone: '011-4155 3300' },
  { name: 'Cedarfield Superspeciality Hospital', city: 'Delhi',     state: 'Delhi',         pincode: '110085', area: 'Rohini',          beds: 400, phone: '011-2786 9900' },
  { name: 'Suncrest Hospital',                   city: 'Bengaluru', state: 'Karnataka',     pincode: '560034', area: 'Koramangala',     beds: 350, phone: '080-4030 5500' },
  { name: 'Palmgrove Health City',               city: 'Bengaluru', state: 'Karnataka',     pincode: '560066', area: 'Whitefield',      beds: 620, phone: '080-4949 1200' },
  { name: 'Stonebridge Ortho & Spine Centre',    city: 'Bengaluru', state: 'Karnataka',     pincode: '560011', area: 'Jayanagar',       beds: 140, phone: '080-2663 8800' },
  { name: 'Riverbend General Hospital',          city: 'Pune',      state: 'Maharashtra',   pincode: '411004', area: 'Deccan Gymkhana', beds: 300, phone: '020-2567 4200' },
  { name: 'Meadowlark Multispeciality Hospital', city: 'Pune',      state: 'Maharashtra',   pincode: '411057', area: 'Hinjawadi',       beds: 260, phone: '020-6730 1100' },
  { name: 'Lakeshore Institute of Oncology',     city: 'Chennai',   state: 'Tamil Nadu',    pincode: '600020', area: 'Adyar',           beds: 240, phone: '044-4211 6600' },
  { name: 'Whitfield Memorial Hospital',         city: 'Chennai',   state: 'Tamil Nadu',    pincode: '600040', area: 'Anna Nagar',      beds: 380, phone: '044-2626 4400' },
  { name: 'Copperfield Care Hospital',           city: 'Hyderabad', state: 'Telangana',     pincode: '500034', area: 'Banjara Hills',   beds: 450, phone: '040-4567 8900' },
  { name: 'Fernhill Kidney & Urology Institute', city: 'Hyderabad', state: 'Telangana',     pincode: '500081', area: 'Gachibowli',      beds: 160, phone: '040-6789 2300' },
  { name: 'Eastbrook Hospital',                  city: 'Kolkata',   state: 'West Bengal',   pincode: '700019', area: 'Ballygunge',      beds: 340, phone: '033-4066 5500' },
  { name: 'Marigold Superspeciality Hospital',   city: 'Kolkata',   state: 'West Bengal',   pincode: '700091', area: 'Salt Lake',       beds: 420, phone: '033-2357 8800' },
  { name: 'Westwind General Hospital',           city: 'Ahmedabad', state: 'Gujarat',       pincode: '380015', area: 'Satellite',       beds: 280, phone: '079-4890 1100' },
  { name: 'Junipers Children’s Hospital',   city: 'Ahmedabad', state: 'Gujarat',       pincode: '380054', area: 'Bodakdev',        beds: 120, phone: '079-4020 3300' },
  { name: 'Rosewood Heart & Vascular Centre',    city: 'Jaipur',    state: 'Rajasthan',     pincode: '302015', area: 'Tonk Road',       beds: 200, phone: '0141-410 6700' },
  { name: 'Clearwater Multispeciality Hospital', city: 'Jaipur',    state: 'Rajasthan',     pincode: '302021', area: 'Vaishali Nagar',  beds: 310, phone: '0141-298 4500' },
  { name: 'Oakridge Hospital',                   city: 'Lucknow',   state: 'Uttar Pradesh', pincode: '226010', area: 'Gomti Nagar',     beds: 360, phone: '0522-430 9900' },
  { name: 'Brightwater Eye & ENT Institute',     city: 'Lucknow',   state: 'Uttar Pradesh', pincode: '226001', area: 'Hazratganj',      beds: 90,  phone: '0522-262 7100' },
  { name: 'Goldleaf General Hospital',           city: 'Kochi',     state: 'Kerala',        pincode: '682016', area: 'Ernakulam South', beds: 270, phone: '0484-235 6600' },
];

export const HOSPITAL_STATES = [...new Set(HOSPITALS.map((h) => h.state))].sort();
